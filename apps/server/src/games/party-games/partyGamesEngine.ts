import crypto from 'node:crypto';
import {
  customPollSchema,
  GAME_CATALOG,
  partyVoteSchema,
  twoTruthsSubmitSchema,
  wheelSpinSchema,
  type GameId,
  type PartyGameState,
  type PartyOption,
  type RoundPointAward,
} from '@chaos/shared';
import {
  buildRankings,
  calculateSpeedMultiplier,
  type GameEngine,
  type GameRuntimeContext,
} from '../engine';
import { isContentSafe, sanitizeText } from '../../utils/moderation';
import {
  HOT_TAKES_PROMPTS,
  MOST_LIKELY_TO_PROMPTS,
  NEVER_HAVE_I_EVER_PROMPTS,
  QUICK_QUIZ_PACK,
  WOULD_YOU_RATHER_PROMPTS,
} from '../../utils/prompts';

type PartyGameId = Exclude<GameId, 'truth-dare' | 'kings-game' | 'who-said-that'>;
const REVEAL_HOLD_MS = 5000;

export class PartyGamesEngine implements GameEngine<PartyGameState> {
  private state!: PartyGameState;
  private votes = new Map<string, { optionId: string; votedAt: number }>();
  private lieIndex: number | null = null;
  private correctOptionId: string | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private roundStartedAt = Date.now();

  constructor(public readonly gameId: PartyGameId) {}

  cleanup(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  start(ctx: GameRuntimeContext): PartyGameState {
    this.cleanup();
    this.votes.clear();
    this.setupRound(ctx, 1);
    return this.getPublicState();
  }

  getPublicState(): PartyGameState {
    return {
      ...this.state,
      options: [...this.state.options],
      votedPlayerIds: [...this.state.votedPlayerIds],
      voteCounts: { ...this.state.voteCounts },
      roundPoints: this.state.roundPoints ? { ...this.state.roundPoints } : {},
    };
  }

  handleSubmit(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    if (this.gameId === 'two-truths-lie') {
      if (this.state.storytellerId !== playerId) {
        return { ok: false, error: 'Only the active storyteller can submit statements.' };
      }
      const parsed = twoTruthsSubmitSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: 'Provide 3 statements and mark which one is the lie.' };
      }
      for (const s of parsed.data.statements) {
        const safety = isContentSafe(s);
        if (!safety.safe) return { ok: false, error: safety.reason };
      }
      this.lieIndex = parsed.data.lieIndex;
      this.correctOptionId = `stmt-${parsed.data.lieIndex}`;
      this.state.options = parsed.data.statements.map((s, idx) => ({
        id: `stmt-${idx}`,
        label: sanitizeText(s),
      }));
      this.enterVotingPhase(ctx);
      return { ok: true };
    }

    if (this.gameId === 'random-wheel') {
      const parsed = wheelSpinSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: 'Provide between 2 and 12 wheel items.' };
      }
      const winnerIdx = crypto.randomInt(0, parsed.data.items.length);
      this.state.options = parsed.data.items.map((item, idx) => ({
        id: `slice-${idx}`,
        label: sanitizeText(item),
      }));
      this.state.wheelWinnerIndex = winnerIdx;
      this.state.winnerOptionId = `slice-${winnerIdx}`;
      this.state.phase = 'reveal';
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (this.gameId === 'custom-polls') {
      const parsed = customPollSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: 'Invalid poll question or options.' };
      }
      this.votes.clear();
      this.state.promptText = sanitizeText(parsed.data.question);
      this.state.options = parsed.data.options.map((opt, idx) => ({
        id: `opt-${idx}`,
        label: sanitizeText(opt),
      }));
      this.state.votedPlayerIds = [];
      this.state.voteCounts = {};
      this.enterVotingPhase(ctx);
      return { ok: true };
    }

    return { ok: false, error: 'Submissions not supported for this game.' };
  }

  handleVote(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    if (this.state.phase !== 'voting') {
      return { ok: false, error: 'Voting is not open right now.' };
    }
    const parsed = partyVoteSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid vote.' };
    }
    if (!this.state.options.some((o) => o.id === parsed.data.optionId)) {
      return { ok: false, error: 'Option does not exist.' };
    }

    // Storyteller in Two Truths & A Lie CAN vote to bluff, but won't receive points
    this.votes.set(playerId, { optionId: parsed.data.optionId, votedAt: Date.now() });
    this.state.votedPlayerIds = Array.from(this.votes.keys());

    if (this.votes.size >= ctx.players.length) {
      this.revealRound(ctx);
    } else {
      ctx.broadcastState(this.getPublicState());
    }
    return { ok: true };
  }

  handleAction(
    ctx: GameRuntimeContext,
    playerId: string,
    action: string
  ): { ok: boolean; error?: string } {
    const player = ctx.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      return { ok: false, error: 'Only the host can control round progression.' };
    }

    if (action === 'reveal') {
      this.revealRound(ctx);
      return { ok: true };
    }

    if (action === 'next-round') {
      this.advanceRound(ctx);
      return { ok: true };
    }

    return { ok: false, error: `Unknown action: ${action}` };
  }

  private enterVotingPhase(ctx: GameRuntimeContext) {
    this.cleanup();
    this.roundStartedAt = Date.now();
    const timerMs = ctx.settings.timerSeconds > 0 ? ctx.settings.timerSeconds * 1000 : null;
    this.state.phase = 'voting';
    this.state.endsAt = timerMs ? this.roundStartedAt + timerMs : null;
    ctx.broadcastState(this.getPublicState());

    if (timerMs) {
      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'voting') {
          this.revealRound(ctx);
        }
      }, timerMs);
    }
  }

  private revealRound(ctx: GameRuntimeContext) {
    this.cleanup();
    const counts: Record<string, number> = {};
    const roundPoints: Record<string, RoundPointAward> = {};
    for (const opt of this.state.options) counts[opt.id] = 0;

    for (const [voterId, vote] of this.votes.entries()) {
      counts[vote.optionId] = (counts[vote.optionId] ?? 0) + 1;

      if (this.gameId === 'two-truths-lie' && this.state.storytellerId === voterId) {
        roundPoints[voterId] = { points: 0, label: 'Bluff Vote (0 pts)' };
        continue;
      }

      if (
        ctx.settings.enableScoring &&
        this.correctOptionId &&
        vote.optionId === this.correctOptionId
      ) {
        const { multiplier, label } = calculateSpeedMultiplier(
          vote.votedAt,
          this.roundStartedAt,
          ctx.settings.timerSeconds
        );
        const pts = Math.round(100 * multiplier);
        ctx.awardScore(voterId, pts);
        roundPoints[voterId] = { points: pts, multiplier, label };
      }
    }

    let winnerId: string | null = null;
    let maxVotes = -1;
    for (const [optId, count] of Object.entries(counts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = optId;
      }
    }

    if (this.gameId === 'most-likely-to' && winnerId && ctx.settings.enableScoring) {
      ctx.awardScore(winnerId, 25);
      roundPoints[winnerId] = { points: 25, label: 'Most Likely (+25)' };
    }

    const autoContinue =
      ctx.settings.timerSeconds > 0 &&
      this.gameId !== 'random-wheel' &&
      this.gameId !== 'custom-polls';

    this.state.voteCounts = counts;
    this.state.winnerOptionId = winnerId;
    this.state.correctOptionId = this.correctOptionId;
    this.state.roundPoints = roundPoints;
    this.state.phase = 'reveal';
    this.state.endsAt = autoContinue ? Date.now() + REVEAL_HOLD_MS : null;
    ctx.broadcastState(this.getPublicState());

    if (autoContinue) {
      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'reveal') {
          this.advanceRound(ctx);
        }
      }, REVEAL_HOLD_MS);
    }
  }

  private advanceRound(ctx: GameRuntimeContext) {
    this.cleanup();
    if (this.state.round >= this.state.totalRounds) {
      this.state.phase = 'finished';
      this.state.endsAt = null;
      ctx.broadcastState(this.getPublicState());
      const meta = GAME_CATALOG.find((g) => g.id === this.gameId);
      ctx.finishGame({
        gameId: this.gameId,
        gameName: meta?.name ?? this.gameId,
        rankings: buildRankings(ctx.players),
        highlights: [
          {
            title: 'Session Complete',
            description: `${this.state.round} rounds completed.`,
          },
        ],
        endedAt: Date.now(),
      });
      return;
    }

    this.votes.clear();
    this.setupRound(ctx, this.state.round + 1);
    ctx.broadcastState(this.getPublicState());
  }

  private setupRound(ctx: GameRuntimeContext, round: number) {
    this.cleanup();
    this.correctOptionId = null;
    this.lieIndex = null;
    this.roundStartedAt = Date.now();
    const totalRounds = Math.min(ctx.settings.rounds, 8);
    let promptText = '';
    let subText: string | undefined;
    let options: PartyOption[] = [];
    let phase: PartyGameState['phase'] = 'voting';
    let storytellerId: string | null = null;

    switch (this.gameId) {
      case 'most-likely-to': {
        promptText = MOST_LIKELY_TO_PROMPTS[(round - 1) % MOST_LIKELY_TO_PROMPTS.length];
        options = ctx.players.map((p) => ({ id: p.id, label: p.nickname }));
        break;
      }
      case 'never-have-i-ever': {
        promptText = NEVER_HAVE_I_EVER_PROMPTS[(round - 1) % NEVER_HAVE_I_EVER_PROMPTS.length];
        options = [
          { id: 'have', label: 'I have' },
          { id: 'never', label: 'I have never' },
        ];
        break;
      }
      case 'would-you-rather': {
        const item = WOULD_YOU_RATHER_PROMPTS[(round - 1) % WOULD_YOU_RATHER_PROMPTS.length];
        promptText = item.question;
        options = [
          { id: 'a', label: item.a },
          { id: 'b', label: item.b },
        ];
        break;
      }
      case 'hot-takes': {
        promptText = HOT_TAKES_PROMPTS[(round - 1) % HOT_TAKES_PROMPTS.length];
        options = [
          { id: 'agree', label: 'Agree' },
          { id: 'disagree', label: 'Disagree' },
          { id: 'unsure', label: 'Unsure' },
        ];
        break;
      }
      case 'two-truths-lie': {
        const storyteller = ctx.players[(round - 1) % ctx.players.length];
        storytellerId = storyteller?.id ?? null;
        promptText = `${storyteller?.nickname ?? 'Player'} is writing Two Truths & a Lie...`;
        phase = 'prompt';
        break;
      }
      case 'quick-quiz': {
        const q = QUICK_QUIZ_PACK[(round - 1) % QUICK_QUIZ_PACK.length];
        promptText = q.question;
        options = q.options;
        this.correctOptionId = q.correctOptionId;
        break;
      }
      case 'random-wheel': {
        promptText = 'Customize the wheel slices and spin!';
        options = ctx.players.map((p, idx) => ({ id: `slice-${idx}`, label: p.nickname }));
        phase = 'prompt';
        break;
      }
      case 'custom-polls': {
        promptText = 'Host is creating a custom poll...';
        options = [
          { id: 'opt-0', label: 'Yes' },
          { id: 'opt-1', label: 'No' },
        ];
        phase = 'prompt';
        break;
      }
    }

    const timerMs =
      phase === 'voting' && ctx.settings.timerSeconds > 0
        ? ctx.settings.timerSeconds * 1000
        : null;

    this.state = {
      gameId: this.gameId,
      phase,
      round,
      totalRounds,
      promptText,
      subText,
      options,
      votedPlayerIds: [],
      voteCounts: {},
      winnerOptionId: null,
      correctOptionId: null,
      wheelWinnerIndex: null,
      storytellerId,
      roundPoints: {},
      endsAt: timerMs ? this.roundStartedAt + timerMs : null,
    };

    if (timerMs) {
      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'voting') {
          this.revealRound(ctx);
        }
      }, timerMs);
    }
  }
}
