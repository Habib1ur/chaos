import crypto from 'node:crypto';
import {
  anonymousGuessSchema,
  anonymousSubmitSchema,
  type AnonymousPublicStatement,
  type RoundPointAward,
  type WhoSaidThatState,
} from '@chaos/shared';
import {
  buildRankings,
  calculateSpeedMultiplier,
  type GameEngine,
  type GameRuntimeContext,
} from '../engine';
import { isContentSafe, sanitizeText } from '../../utils/moderation';
import { shuffleArray } from '../../utils/crypto';

interface InternalStatement {
  id: string;
  text: string;
  category: WhoSaidThatState['currentStatement'] extends infer T
    ? T extends { category: infer C }
      ? C
      : never
    : never;
  /** Strictly server-side only! Never leaked in public payloads during submitting/guessing. */
  authorId: string;
  authorName: string;
}

const REVEAL_HOLD_MS = 5000;

export class WhoSaidThatEngine implements GameEngine<WhoSaidThatState> {
  readonly gameId = 'who-said-that' as const;
  private state!: WhoSaidThatState;
  private statements: InternalStatement[] = [];
  private submissionsPerPlayer = new Map<string, number>();
  private guesses = new Map<string, { targetPlayerId: string; votedAt: number }>();
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private roundStartedAt = Date.now();

  cleanup(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  start(ctx: GameRuntimeContext): WhoSaidThatState {
    this.cleanup();
    this.statements = [];
    this.submissionsPerPlayer.clear();
    this.guesses.clear();

    const mode = ctx.settings.anonymousMode ?? 'classic';
    const messagesPerPlayer = ctx.settings.anonymousMessagesPerPlayer ?? 2;
    const timerMs = ctx.settings.timerSeconds > 0 ? ctx.settings.timerSeconds * 1000 : null;

    let spotlightPlayerId: string | null = null;
    let spotlightPlayerName: string | null = null;
    let initialPhase: WhoSaidThatState['phase'] = 'submitting';

    if (mode === 'spotlight' && ctx.players.length > 0) {
      const picked = ctx.players[crypto.randomInt(0, ctx.players.length)];
      spotlightPlayerId = picked.id;
      spotlightPlayerName = picked.nickname;
      initialPhase = 'selecting-spotlight';

      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'selecting-spotlight') {
          this.enterSubmittingPhase(ctx);
        }
      }, 3000);
    }

    this.state = {
      gameId: 'who-said-that',
      phase: initialPhase,
      mode,
      spotlightPlayerId,
      spotlightPlayerName,
      messagesPerPlayer,
      round: 1,
      totalStatements: 0,
      submissionsReceivedCount: 0,
      submittedPlayerIds: [],
      currentStatementIndex: -1,
      currentStatement: null,
      guessesCount: 0,
      guessedPlayerIds: [],
      voteDistribution: {},
      liveVotes: {},
      roundPoints: {},
      mySubmissionCount: 0,
      endsAt: initialPhase === 'submitting' && timerMs ? Date.now() + timerMs : null,
    };

    if (initialPhase === 'submitting' && timerMs) {
      this.scheduleSubmissionAutoAdvance(ctx, timerMs);
    }

    return this.getPublicState();
  }

  getPublicState(playerId?: string): WhoSaidThatState {
    return {
      ...this.state,
      submittedPlayerIds: [...this.state.submittedPlayerIds],
      guessedPlayerIds: [...this.state.guessedPlayerIds],
      voteDistribution: { ...this.state.voteDistribution },
      liveVotes: Object.fromEntries(
        Object.entries(this.state.liveVotes).map(([k, v]) => [k, [...v]])
      ),
      roundPoints: this.state.roundPoints ? { ...this.state.roundPoints } : {},
      mySubmissionCount: playerId ? (this.submissionsPerPlayer.get(playerId) ?? 0) : 0,
    };
  }

  handleSubmit(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    if (this.state.phase !== 'submitting') {
      return { ok: false, error: 'Anonymous submissions are closed.' };
    }
    const player = ctx.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found.' };

    if (this.state.mode === 'spotlight' && this.state.spotlightPlayerId === playerId) {
      return {
        ok: false,
        error: 'You are in the Spotlight this round—other players are writing messages for you!',
      };
    }

    const maxMsgs = this.state.messagesPerPlayer;
    const count = this.submissionsPerPlayer.get(playerId) ?? 0;
    if (count >= maxMsgs) {
      return { ok: false, error: `You have reached the maximum of ${maxMsgs} submissions.` };
    }

    const parsed = anonymousSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid submission.' };
    }
    const safety = isContentSafe(parsed.data.text);
    if (!safety.safe) {
      return { ok: false, error: safety.reason };
    }

    this.statements.push({
      id: `anon-${crypto.randomUUID().slice(0, 8)}`,
      text: sanitizeText(parsed.data.text),
      category: parsed.data.category,
      authorId: player.id,
      authorName: player.nickname,
    });

    this.submissionsPerPlayer.set(playerId, count + 1);
    if (!this.state.submittedPlayerIds.includes(playerId)) {
      this.state.submittedPlayerIds.push(playerId);
    }
    this.state.submissionsReceivedCount = this.statements.length;
    ctx.broadcastState(this.getPublicState());
    return { ok: true };
  }

  handleVote(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    if (this.state.phase !== 'guessing') {
      return { ok: false, error: 'Guessing is not open right now.' };
    }
    const parsed = anonymousGuessSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid guess.' };
    }
    if (!ctx.players.some((p) => p.id === parsed.data.targetPlayerId)) {
      return { ok: false, error: 'Selected player is not in this room.' };
    }
    if (this.guesses.has(playerId)) {
      return { ok: false, error: 'You have already locked in your guess.' };
    }

    // Even the writer and the Spotlight player can vote!
    this.guesses.set(playerId, {
      targetPlayerId: parsed.data.targetPlayerId,
      votedAt: Date.now(),
    });
    this.state.guessesCount = this.guesses.size;
    this.state.guessedPlayerIds = Array.from(this.guesses.keys());

    // Recompute live voting balls & counts for everyone to see immediately
    const dist: Record<string, number> = {};
    const live: Record<string, string[]> = {};
    for (const [voterId, vote] of this.guesses.entries()) {
      dist[vote.targetPlayerId] = (dist[vote.targetPlayerId] ?? 0) + 1;
      if (!live[vote.targetPlayerId]) live[vote.targetPlayerId] = [];
      live[vote.targetPlayerId].push(voterId);
    }
    this.state.voteDistribution = dist;
    this.state.liveVotes = live;

    // Instant auto-reveal when everyone in the room has voted!
    if (this.guesses.size >= ctx.players.length) {
      this.revealAnswer(ctx);
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
      return { ok: false, error: 'Only the host can advance Who Said That? phases.' };
    }

    if (action === 'skip-spotlight-anim') {
      if (this.state.phase !== 'selecting-spotlight') {
        return { ok: false, error: 'Not selecting spotlight.' };
      }
      this.enterSubmittingPhase(ctx);
      return { ok: true };
    }

    if (action === 'start-guessing') {
      if (this.state.phase !== 'submitting') {
        return { ok: false, error: 'Not in submission phase.' };
      }
      if (this.statements.length === 0) {
        return { ok: false, error: 'Wait for at least 1 anonymous statement first.' };
      }
      this.startGuessing(ctx);
      return { ok: true };
    }

    if (action === 'reveal-answer') {
      if (this.state.phase !== 'guessing') {
        return { ok: false, error: 'Not in guessing phase.' };
      }
      this.revealAnswer(ctx);
      return { ok: true };
    }

    if (action === 'next-statement') {
      this.advanceToNextStatement(ctx);
      return { ok: true };
    }

    return { ok: false, error: `Unknown action: ${action}` };
  }

  private enterSubmittingPhase(ctx: GameRuntimeContext) {
    this.cleanup();
    const timerMs = ctx.settings.timerSeconds > 0 ? ctx.settings.timerSeconds * 1000 : null;
    this.state.phase = 'submitting';
    this.state.endsAt = timerMs ? Date.now() + timerMs : null;
    ctx.broadcastState(this.getPublicState());
    if (timerMs) {
      this.scheduleSubmissionAutoAdvance(ctx, timerMs);
    }
  }

  private scheduleSubmissionAutoAdvance(ctx: GameRuntimeContext, timerMs: number) {
    this.cleanup();
    this.phaseTimer = setTimeout(() => {
      if (this.state.phase !== 'submitting') return;
      if (this.statements.length > 0) {
        this.startGuessing(ctx);
      } else {
        this.finishGameSession(ctx);
      }
    }, timerMs);
  }

  private startGuessing(ctx: GameRuntimeContext) {
    this.cleanup();
    // Shuffle statements so submission order NEVER reveals authorship
    this.statements = shuffleArray(this.statements);
    this.state.totalStatements = this.statements.length;
    this.loadStatementForGuessing(ctx, 0);
  }

  private loadStatementForGuessing(ctx: GameRuntimeContext, index: number) {
    this.cleanup();
    const stmt = this.statements[index];
    this.guesses.clear();
    this.roundStartedAt = Date.now();

    const publicStmt: AnonymousPublicStatement = {
      id: stmt.id,
      text: stmt.text,
      category: stmt.category,
      // Explicitly omit authorId and authorName!
    };
    const timerMs = ctx.settings.timerSeconds > 0 ? ctx.settings.timerSeconds * 1000 : null;
    this.state.phase = 'guessing';
    this.state.currentStatementIndex = index;
    this.state.round = index + 1;
    this.state.currentStatement = publicStmt;
    this.state.guessesCount = 0;
    this.state.guessedPlayerIds = [];
    this.state.voteDistribution = {};
    this.state.liveVotes = {};
    this.state.roundPoints = {};
    this.state.endsAt = timerMs ? this.roundStartedAt + timerMs : null;
    ctx.broadcastState(this.getPublicState());

    if (timerMs) {
      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'guessing') {
          this.revealAnswer(ctx);
        }
      }, timerMs);
    }
  }

  private revealAnswer(ctx: GameRuntimeContext) {
    this.cleanup();
    const current = this.statements[this.state.currentStatementIndex];
    if (!current) return;

    const dist: Record<string, number> = {};
    const live: Record<string, string[]> = {};
    const roundPoints: Record<string, RoundPointAward> = {};
    let correctCount = 0;

    for (const [guesserId, vote] of this.guesses.entries()) {
      dist[vote.targetPlayerId] = (dist[vote.targetPlayerId] ?? 0) + 1;
      if (!live[vote.targetPlayerId]) live[vote.targetPlayerId] = [];
      live[vote.targetPlayerId].push(guesserId);

      // Author can vote to bluff, but gets 0 guess points
      if (guesserId === current.authorId) {
        roundPoints[guesserId] = { points: 0, label: 'Bluff Vote (0 pts)' };
        continue;
      }

      if (vote.targetPlayerId === current.authorId) {
        correctCount += 1;
        if (ctx.settings.enableScoring) {
          const { multiplier, label } = calculateSpeedMultiplier(
            vote.votedAt,
            this.roundStartedAt,
            ctx.settings.timerSeconds
          );
          const pts = Math.round(100 * multiplier);
          ctx.awardScore(guesserId, pts);
          roundPoints[guesserId] = { points: pts, multiplier, label };
        }
      }
    }

    // Bonus if author fooled everyone
    if (correctCount === 0 && this.guesses.size > 0 && ctx.settings.enableScoring) {
      ctx.awardScore(current.authorId, 50);
      roundPoints[current.authorId] = {
        points: (roundPoints[current.authorId]?.points ?? 0) + 50,
        label: 'Fooled Everyone! (+50)',
      };
    }

    const autoContinue = ctx.settings.timerSeconds > 0;
    this.state.phase = 'reveal';
    this.state.voteDistribution = dist;
    this.state.liveVotes = live;
    this.state.roundPoints = roundPoints;
    this.state.currentStatement = {
      id: current.id,
      text: current.text,
      category: current.category,
      ...(ctx.settings.revealAuthorsInAnonymous
        ? { authorId: current.authorId, authorName: current.authorName }
        : {}),
    };
    this.state.endsAt = autoContinue ? Date.now() + REVEAL_HOLD_MS : null;
    ctx.broadcastState(this.getPublicState());

    if (autoContinue) {
      this.phaseTimer = setTimeout(() => {
        if (this.state.phase === 'reveal') {
          this.advanceToNextStatement(ctx);
        }
      }, REVEAL_HOLD_MS);
    }
  }

  private advanceToNextStatement(ctx: GameRuntimeContext) {
    this.cleanup();
    const nextIdx = this.state.currentStatementIndex + 1;
    if (nextIdx >= this.statements.length) {
      this.finishGameSession(ctx);
      return;
    }
    this.loadStatementForGuessing(ctx, nextIdx);
  }

  private finishGameSession(ctx: GameRuntimeContext) {
    this.cleanup();
    this.state.phase = 'finished';
    this.state.endsAt = null;
    ctx.broadcastState(this.getPublicState());
    ctx.finishGame({
      gameId: 'who-said-that',
      gameName: 'Who Said That?',
      rankings: buildRankings(ctx.players, 'Master Detective'),
      highlights: [
        {
          title: 'Secrets Shared',
          description: `${this.statements.length} anonymous statements investigated.`,
        },
      ],
      endedAt: Date.now(),
    });
  }
}
