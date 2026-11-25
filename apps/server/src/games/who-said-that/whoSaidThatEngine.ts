import crypto from 'node:crypto';
import {
  anonymousGuessSchema,
  anonymousSubmitSchema,
  type AnonymousPublicStatement,
  type WhoSaidThatState,
} from '@chaos/shared';
import { buildRankings, type GameEngine, type GameRuntimeContext } from '../engine';
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

export class WhoSaidThatEngine implements GameEngine<WhoSaidThatState> {
  readonly gameId = 'who-said-that' as const;
  private state!: WhoSaidThatState;
  private statements: InternalStatement[] = [];
  private submissionsPerPlayer = new Map<string, number>();
  private guesses = new Map<string, string>(); // guesserId -> targetPlayerId

  start(ctx: GameRuntimeContext): WhoSaidThatState {
    this.statements = [];
    this.submissionsPerPlayer.clear();
    this.guesses.clear();
    this.state = {
      gameId: 'who-said-that',
      phase: 'submitting',
      round: 1,
      totalStatements: 0,
      submissionsReceivedCount: 0,
      submittedPlayerIds: [],
      currentStatementIndex: -1,
      currentStatement: null,
      guessesCount: 0,
      guessedPlayerIds: [],
      voteDistribution: {},
      mySubmissionCount: 0,
      endsAt: Date.now() + 60_000,
    };
    return this.getPublicState();
  }

  getPublicState(playerId?: string): WhoSaidThatState {
    return {
      ...this.state,
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

    const count = this.submissionsPerPlayer.get(playerId) ?? 0;
    if (count >= 2) {
      return { ok: false, error: 'You have reached the maximum of 2 submissions.' };
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

    this.guesses.set(playerId, parsed.data.targetPlayerId);
    this.state.guessesCount = this.guesses.size;
    this.state.guessedPlayerIds = Array.from(this.guesses.keys());
    ctx.broadcastState(this.getPublicState());
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

    if (action === 'start-guessing') {
      if (this.state.phase !== 'submitting') {
        return { ok: false, error: 'Not in submission phase.' };
      }
      if (this.statements.length === 0) {
        return { ok: false, error: 'Wait for at least 1 anonymous statement first.' };
      }
      // Shuffle statements so submission order NEVER reveals authorship
      this.statements = shuffleArray(this.statements);
      this.state.totalStatements = this.statements.length;
      this.loadStatementForGuessing(ctx, 0);
      return { ok: true };
    }

    if (action === 'reveal-answer') {
      if (this.state.phase !== 'guessing') {
        return { ok: false, error: 'Not in guessing phase.' };
      }
      const current = this.statements[this.state.currentStatementIndex];
      if (!current) return { ok: false, error: 'No active statement.' };

      const dist: Record<string, number> = {};
      let correctCount = 0;

      for (const [guesserId, targetId] of this.guesses.entries()) {
        dist[targetId] = (dist[targetId] ?? 0) + 1;
        if (targetId === current.authorId && guesserId !== current.authorId) {
          correctCount += 1;
          if (ctx.settings.enableScoring) {
            ctx.awardScore(guesserId, 100);
          }
        }
      }

      // Bonus if author fooled everyone
      if (correctCount === 0 && this.guesses.size > 0 && ctx.settings.enableScoring) {
        ctx.awardScore(current.authorId, 50);
      }

      this.state.phase = 'reveal';
      this.state.voteDistribution = dist;
      this.state.currentStatement = {
        id: current.id,
        text: current.text,
        category: current.category,
        ...(ctx.settings.revealAuthorsInAnonymous
          ? { authorId: current.authorId, authorName: current.authorName }
          : {}),
      };
      this.state.endsAt = null;
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'next-statement') {
      const nextIdx = this.state.currentStatementIndex + 1;
      if (nextIdx >= this.statements.length) {
        this.state.phase = 'finished';
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
        return { ok: true };
      }
      this.loadStatementForGuessing(ctx, nextIdx);
      return { ok: true };
    }

    return { ok: false, error: `Unknown action: ${action}` };
  }

  private loadStatementForGuessing(ctx: GameRuntimeContext, index: number) {
    const stmt = this.statements[index];
    this.guesses.clear();
    const publicStmt: AnonymousPublicStatement = {
      id: stmt.id,
      text: stmt.text,
      category: stmt.category,
      // Explicitly omit authorId and authorName!
    };
    this.state.phase = 'guessing';
    this.state.currentStatementIndex = index;
    this.state.round = index + 1;
    this.state.currentStatement = publicStmt;
    this.state.guessesCount = 0;
    this.state.guessedPlayerIds = [];
    this.state.voteDistribution = {};
    this.state.endsAt = Date.now() + ctx.settings.timerSeconds * 1000;
    ctx.broadcastState(this.getPublicState());
  }
}
