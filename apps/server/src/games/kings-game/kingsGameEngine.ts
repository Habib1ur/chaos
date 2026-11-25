import crypto from 'node:crypto';
import {
  kingsAssignmentSchema,
  kingsCoupDareSchema,
  type KingsGameState,
  type KingsMissionLevel,
  type KingsPrivateState,
  type KingsPublicAssignment,
} from '@chaos/shared';
import { buildRankings, type GameEngine, type GameRuntimeContext } from '../engine';
import { isContentSafe, sanitizeText } from '../../utils/moderation';
import { shuffleArray } from '../../utils/crypto';

interface InternalSlot {
  number: number;
  playerId: string;
  playerName: string;
  playerAvatar: string;
}

interface SecretKingAssignment {
  targetNumber: number;
  jointTargetNumber: number | null;
  type: 'truth' | 'dare';
  level: KingsMissionLevel;
  isStarPick: boolean;
  text: string;
}

const FALLBACK_COUP_DARES = [
  'Do 10 dramatic jumping jacks while shouting "I am a humble peasant!" on every jump.',
  'Deliver a 15-second royal apology speech to the room in a dramatic villain voice.',
  'Compliment every single subject in the room using only royal medieval titles.',
  'Type an overly dramatic confession in room chat using only emojis.',
];

export class KingsGameEngine implements GameEngine<KingsGameState> {
  readonly gameId = 'kings-game' as const;
  private state!: KingsGameState;
  private previousKingIds: string[] = [];
  private internalSlots: InternalSlot[] = [];
  private shuffleTimer: ReturnType<typeof setTimeout> | null = null;
  /** Server-only secret storage. Never sent to clients until reveal. */
  private secretAssignments: SecretKingAssignment[] = [];
  /** Server-only secret Coup Dares: playerId -> dare text */
  private coupDares = new Map<string, string>();

  cleanup(): void {
    if (this.shuffleTimer) {
      clearTimeout(this.shuffleTimer);
      this.shuffleTimer = null;
    }
  }

  start(ctx: GameRuntimeContext): KingsGameState {
    this.setupRound(ctx, 1);
    return this.getPublicState();
  }

  getPublicState(): KingsGameState {
    return {
      ...this.state,
      coupDaresSubmittedPlayerIds: [...this.state.coupDaresSubmittedPlayerIds],
      numberSlots: [...this.state.numberSlots],
      revealedAssignments: this.state.revealedAssignments.map((a) => ({ ...a })),
      kingTwist: this.state.kingTwist ? { ...this.state.kingTwist } : null,
    };
  }

  getPrivateState(playerId: string): KingsPrivateState | null {
    const slot = this.internalSlots.find((s) => s.playerId === playerId);
    if (!slot) return null;
    const isKing = this.state.kingPlayerId === playerId;
    return {
      myNumber: slot.number,
      isKing,
      hasSubmittedCoupDare: this.coupDares.has(playerId),
      draftSlots: isKing
        ? this.internalSlots
            .filter((s) => s.playerId !== playerId)
            .map((s) => ({ number: s.number }))
        : undefined,
    };
  }

  onPlayerReconnect(ctx: GameRuntimeContext, playerId: string): void {
    const priv = this.getPrivateState(playerId);
    if (priv) {
      ctx.sendPrivateToPlayer(playerId, 'game:kings:private', priv);
    }
  }

  handleAction(
    ctx: GameRuntimeContext,
    playerId: string,
    action: string,
    data?: unknown
  ): { ok: boolean; error?: string } {
    const player = ctx.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found.' };

    if (action === 'start-king-selection') {
      if (!player.isHost) {
        return { ok: false, error: 'Only the host can start the King selection.' };
      }
      if (this.state.phase !== 'coup-dares') {
        return { ok: false, error: 'Not in Coup Dares phase.' };
      }
      this.crownKingAndNotify(ctx);
      return { ok: true };
    }

    if (action === 'advance-to-assign') {
      if (!player.isHost && this.state.kingPlayerId !== playerId) {
        return { ok: false, error: 'Only the King or host can start assignments.' };
      }
      if (this.state.phase !== 'shuffling' && this.state.phase !== 'king-announced') {
        return { ok: false, error: 'Invalid phase transition.' };
      }
      this.cleanup();
      this.state.phase = 'king-assigning';
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'skip-shuffle') {
      if (!player.isHost && this.state.kingPlayerId !== playerId) {
        return { ok: false, error: 'Only the King or host can skip shuffle.' };
      }
      if (this.state.phase !== 'shuffling') {
        return { ok: false, error: 'Not currently shuffling.' };
      }
      this.cleanup();
      this.state.phase = 'king-announced';
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'unmask-current') {
      if (this.state.phase !== 'revealing') {
        return { ok: false, error: 'Not in reveal phase.' };
      }
      if (!player.isHost && this.state.kingPlayerId !== playerId) {
        return { ok: false, error: 'Only the King or host can unmask the player.' };
      }
      const current = this.state.revealedAssignments[this.state.currentRevealIndex];
      if (!current) return { ok: false, error: 'No active assignment.' };

      const slot = this.internalSlots.find((s) => s.number === current.targetNumber);
      const jointSlot = current.jointTargetNumber
        ? this.internalSlots.find((s) => s.number === current.jointTargetNumber)
        : undefined;

      current.unmasked = true;
      current.targetPlayerId = slot?.playerId ?? null;
      current.targetPlayerName = slot?.playerName ?? null;
      current.targetPlayerAvatar = slot?.playerAvatar ?? null;
      current.jointTargetPlayerId = jointSlot?.playerId ?? null;
      current.jointTargetPlayerName = jointSlot?.playerName ?? null;
      current.jointTargetPlayerAvatar = jointSlot?.playerAvatar ?? null;

      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'resolve-assignment') {
      if (this.state.phase !== 'revealing') {
        return { ok: false, error: 'Not in reveal phase.' };
      }
      const current = this.state.revealedAssignments[this.state.currentRevealIndex];
      if (!current) return { ok: false, error: 'No active assignment.' };
      if (!current.unmasked) {
        return { ok: false, error: 'Unmask the player before resolving the mission.' };
      }
      if (
        current.targetPlayerId !== playerId &&
        current.jointTargetPlayerId !== playerId &&
        !player.isHost &&
        this.state.kingPlayerId !== playerId
      ) {
        return { ok: false, error: 'Only the target player, King, or host can resolve.' };
      }

      const outcome = (data as { outcome?: string })?.outcome;
      if (
        outcome !== 'completed' &&
        outcome !== 'creative' &&
        outcome !== 'skipped' &&
        outcome !== 'passed'
      ) {
        return { ok: false, error: 'Invalid outcome.' };
      }

      current.status = outcome;
      if (ctx.settings.enableScoring && (outcome === 'completed' || outcome === 'creative')) {
        const pts = outcome === 'creative' ? 20 : current.type === 'dare' ? 15 : 10;
        if (current.targetPlayerId) ctx.awardScore(current.targetPlayerId, pts);
        if (current.jointTargetPlayerId) ctx.awardScore(current.jointTargetPlayerId, pts);
      }

      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'reveal-next') {
      if (this.state.phase !== 'revealing') {
        return { ok: false, error: 'Game is not in reveal phase.' };
      }
      if (!player.isHost && this.state.kingPlayerId !== playerId) {
        return { ok: false, error: 'Only the King or host can advance reveals.' };
      }
      const nextIdx = this.state.currentRevealIndex + 1;
      if (nextIdx >= this.secretAssignments.length) {
        return this.triggerKingTwist(ctx);
      }
      this.revealIndex(nextIdx);
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'resolve-king-twist') {
      if (this.state.phase !== 'king-twist' || !this.state.kingTwist) {
        return { ok: false, error: 'King Twist is not active.' };
      }
      if (this.state.kingPlayerId !== playerId && !player.isHost) {
        return { ok: false, error: 'Only the King or host can resolve the King Twist.' };
      }
      const outcome = (data as { outcome?: string })?.outcome;
      if (outcome !== 'completed' && outcome !== 'skipped') {
        return { ok: false, error: 'Invalid King Twist outcome.' };
      }
      this.state.kingTwist.status = outcome;
      if (outcome === 'completed' && ctx.settings.enableScoring && this.state.kingPlayerId) {
        ctx.awardScore(this.state.kingPlayerId, 25);
      }
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'next-round') {
      if (!player.isHost) {
        return { ok: false, error: 'Only the host can start the next round.' };
      }
      return this.finishRoundOrGame(ctx);
    }

    return { ok: false, error: `Unknown King's Game action: ${action}` };
  }

  handleSubmit(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    // Phase 1: Coup Dares submission by each player
    if (this.state.phase === 'coup-dares') {
      if (this.coupDares.has(playerId)) {
        return { ok: false, error: 'You already sealed your secret King dare.' };
      }
      const parsed = kingsCoupDareSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: 'Invalid Coup Dare.' };
      }
      let dareText = parsed.data.text.trim();
      if (!dareText) {
        dareText = FALLBACK_COUP_DARES[crypto.randomInt(0, FALLBACK_COUP_DARES.length)];
      } else {
        const safety = isContentSafe(dareText);
        if (!safety.safe) return { ok: false, error: safety.reason };
        dareText = sanitizeText(dareText);
      }

      this.coupDares.set(playerId, dareText);
      this.state.coupDaresSubmittedPlayerIds = Array.from(this.coupDares.keys());
      ctx.sendPrivateToPlayer(playerId, 'game:kings:private', this.getPrivateState(playerId));

      // Auto-advance once every player in the room has sealed their dare
      if (this.coupDares.size >= ctx.players.length) {
        this.crownKingAndNotify(ctx);
      } else {
        ctx.broadcastState(this.getPublicState());
      }
      return { ok: true };
    }

    // Phase 3: King submits secret assignments
    if (this.state.phase !== 'king-assigning' && this.state.phase !== 'king-announced') {
      return { ok: false, error: 'King assignments are not open right now.' };
    }
    if (this.state.kingPlayerId !== playerId) {
      return { ok: false, error: 'Only the crowned King can submit secret assignments.' };
    }
    if (this.state.assignmentsSubmitted) {
      return { ok: false, error: 'Assignments have already been locked in.' };
    }

    const parsed = kingsAssignmentSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid assignments.' };
    }

    const validTargets = new Set(
      this.internalSlots.filter((s) => s.playerId !== playerId).map((s) => s.number)
    );
    const seenTargets = new Set<number>();

    const sanitized: SecretKingAssignment[] = [];
    for (const item of parsed.data.assignments) {
      if (!validTargets.has(item.targetNumber)) {
        return { ok: false, error: `Invalid target number: ${item.targetNumber}` };
      }
      if (seenTargets.has(item.targetNumber)) {
        return { ok: false, error: `Duplicate assignment for Player #${item.targetNumber}` };
      }
      if (
        item.jointTargetNumber != null &&
        (!validTargets.has(item.jointTargetNumber) || item.jointTargetNumber === item.targetNumber)
      ) {
        return { ok: false, error: `Invalid joint partner number: ${item.jointTargetNumber}` };
      }
      const safety = isContentSafe(item.text);
      if (!safety.safe) {
        return { ok: false, error: safety.reason };
      }
      seenTargets.add(item.targetNumber);
      sanitized.push({
        targetNumber: item.targetNumber,
        jointTargetNumber: item.jointTargetNumber ?? null,
        type: item.type,
        level: item.level,
        isStarPick: item.isStarPick,
        text: sanitizeText(item.text),
      });
    }

    if (sanitized.length < validTargets.size) {
      return { ok: false, error: 'Please write a Truth or Dare for every numbered player.' };
    }

    this.secretAssignments = shuffleArray(sanitized);
    this.state.assignmentsSubmitted = true;
    this.state.phase = 'revealing';
    this.state.revealedAssignments = [];
    this.state.currentRevealIndex = -1;
    this.revealIndex(0);
    ctx.broadcastState(this.getPublicState());
    return { ok: true };
  }

  private setupRound(ctx: GameRuntimeContext, round: number) {
    this.coupDares.clear();
    this.secretAssignments = [];

    // Generate unique random 2-digit mystery numbers (10..99)
    const usedNums = new Set<number>();
    const shuffledPlayers = shuffleArray(ctx.players);
    this.internalSlots = shuffledPlayers.map((p) => {
      let num = crypto.randomInt(10, 99);
      while (usedNums.has(num)) {
        num = crypto.randomInt(10, 99);
      }
      usedNums.add(num);
      return {
        number: num,
        playerId: p.id,
        playerName: p.nickname,
        playerAvatar: p.avatarId,
      };
    });

    this.state = {
      gameId: 'kings-game',
      phase: 'coup-dares',
      round,
      totalRounds: Math.min(ctx.settings.rounds, Math.max(3, ctx.players.length)),
      kingPlayerId: null,
      kingPlayerName: null,
      coupDaresSubmittedPlayerIds: [],
      numberSlots: this.internalSlots.map((s) => ({ number: s.number })),
      totalAssignmentsNeeded: Math.max(0, this.internalSlots.length - 1),
      assignmentsSubmitted: false,
      revealedAssignments: [],
      currentRevealIndex: -1,
      kingTwist: null,
      endsAt: null,
    };

    this.emitPrivateStates(ctx);
  }

  private crownKingAndNotify(ctx: GameRuntimeContext) {
    this.cleanup();
    let eligibleKings = ctx.players;
    if (ctx.settings.noConsecutiveKing && this.previousKingIds.length > 0) {
      const lastKing = this.previousKingIds[this.previousKingIds.length - 1];
      const filtered = ctx.players.filter((p) => p.id !== lastKing);
      if (filtered.length > 0) eligibleKings = filtered;
    }

    const king = eligibleKings[crypto.randomInt(0, eligibleKings.length)];
    this.previousKingIds.push(king.id);

    this.state.kingPlayerId = king.id;
    this.state.kingPlayerName = king.nickname;
    this.state.phase = 'shuffling';

    this.emitPrivateStates(ctx);
    ctx.broadcastState(this.getPublicState());

    this.shuffleTimer = setTimeout(() => {
      if (this.state.phase === 'shuffling') {
        this.state.phase = 'king-announced';
        ctx.broadcastState(this.getPublicState());
      }
    }, 3200);
  }

  private emitPrivateStates(ctx: GameRuntimeContext) {
    for (const p of ctx.players) {
      const priv = this.getPrivateState(p.id);
      if (priv) {
        ctx.sendPrivateToPlayer(p.id, 'game:kings:private', priv);
      }
    }
  }

  private revealIndex(index: number) {
    const secret = this.secretAssignments[index];
    if (!secret) return;
    // Prompt-First Reveal: omit targetPlayerId and targetPlayerName until unmasked!
    const pub: KingsPublicAssignment = {
      index,
      targetNumber: secret.targetNumber,
      unmasked: false,
      targetPlayerId: null,
      targetPlayerName: null,
      jointTargetNumber: secret.jointTargetNumber,
      jointTargetPlayerId: null,
      jointTargetPlayerName: null,
      type: secret.type,
      level: secret.level,
      isStarPick: secret.isStarPick,
      text: secret.text,
      status: 'pending',
    };
    this.state.revealedAssignments.push(pub);
    this.state.currentRevealIndex = index;
  }

  private triggerKingTwist(ctx: GameRuntimeContext): { ok: boolean; error?: string } {
    const subjectDares = Array.from(this.coupDares.entries()).filter(
      ([pid]) => pid !== this.state.kingPlayerId
    );
    let decreedByName = 'The Rebellion';
    let text = FALLBACK_COUP_DARES[crypto.randomInt(0, FALLBACK_COUP_DARES.length)];

    if (subjectDares.length > 0) {
      const [authorId, dareText] = subjectDares[crypto.randomInt(0, subjectDares.length)];
      const author = ctx.players.find((p) => p.id === authorId);
      if (author) decreedByName = author.nickname;
      text = dareText;
    }

    this.state.phase = 'king-twist';
    this.state.kingTwist = {
      decreedByName,
      text,
      status: 'pending',
    };
    ctx.broadcastState(this.getPublicState());
    return { ok: true };
  }

  private finishRoundOrGame(ctx: GameRuntimeContext): { ok: boolean; error?: string } {
    if (this.state.round >= this.state.totalRounds) {
      this.state.phase = 'finished';
      ctx.broadcastState(this.getPublicState());
      ctx.finishGame({
        gameId: 'kings-game',
        gameName: "King's Truth or Dare",
        rankings: buildRankings(ctx.players, 'King of Chaos'),
        highlights: [
          {
            title: 'Royal Crowns & Coups',
            description: `${this.state.round} rounds of secret decrees and King Twists completed.`,
          },
        ],
        endedAt: Date.now(),
      });
      return { ok: true };
    }

    this.setupRound(ctx, this.state.round + 1);
    ctx.broadcastState(this.getPublicState());
    return { ok: true };
  }
}
