import crypto from 'node:crypto';
import {
  truthDareSubmitSchema,
  type TruthDarePromptItem,
  type TruthDareState,
} from '@chaos/shared';
import { buildRankings, type GameEngine, type GameRuntimeContext } from '../engine';
import { isContentSafe, sanitizeText } from '../../utils/moderation';
import { BUILTIN_TRUTH_DARE_PROMPTS, filterPromptsBySettings } from '../../utils/prompts';

export class TruthDareEngine implements GameEngine<TruthDareState> {
  readonly gameId = 'truth-dare' as const;
  private state!: TruthDareState;
  private customPrompts: TruthDarePromptItem[] = [];
  private usedPromptIds = new Set<string>();
  private lastPlayerId: string | null = null;

  start(ctx: GameRuntimeContext): TruthDareState {
    const firstPlayer = this.pickNextPlayer(ctx);
    this.state = {
      gameId: 'truth-dare',
      phase: 'choosing-type',
      round: 1,
      totalRounds: ctx.settings.rounds,
      activePlayerId: firstPlayer?.id ?? null,
      choice: null,
      currentPrompt: null,
      lastOutcome: null,
      skipsUsed: {},
      pendingSubmissionsCount: 0,
      endsAt: Date.now() + ctx.settings.timerSeconds * 1000,
    };
    return this.getPublicState();
  }

  getPublicState(playerId?: string): TruthDareState {
    const pending = this.customPrompts.filter((p) => !p.approved);
    return {
      ...this.state,
      pendingSubmissionsCount: pending.length,
      pendingSubmissions: playerId ? pending : undefined,
    };
  }

  handleAction(
    ctx: GameRuntimeContext,
    playerId: string,
    action: string,
    data?: unknown
  ): { ok: boolean; error?: string } {
    const player = ctx.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found in room.' };

    if (action === 'choose-type') {
      if (this.state.phase !== 'choosing-type') {
        return { ok: false, error: 'Not currently choosing Truth or Dare.' };
      }
      if (this.state.activePlayerId !== playerId) {
        return { ok: false, error: 'Only the selected player can choose.' };
      }
      const choice = (data as { choice?: string })?.choice;
      if (choice !== 'truth' && choice !== 'dare') {
        return { ok: false, error: 'Choice must be truth or dare.' };
      }
      const prompt = this.pickPrompt(ctx, choice);
      this.state.choice = choice;
      this.state.currentPrompt = prompt;
      this.state.phase = 'performing';
      this.state.endsAt = Date.now() + ctx.settings.timerSeconds * 1000;
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'complete' || action === 'skip' || action === 'pass') {
      if (this.state.phase !== 'performing') {
        return { ok: false, error: 'No active prompt to resolve.' };
      }
      if (this.state.activePlayerId !== playerId && !player.isHost) {
        return { ok: false, error: 'Only the active player or host can resolve this turn.' };
      }

      const targetPlayer = ctx.players.find((p) => p.id === this.state.activePlayerId);
      if (!targetPlayer) return { ok: false, error: 'Active player missing.' };

      if (action === 'skip') {
        if (!ctx.settings.allowSkip) {
          return { ok: false, error: 'Skipping is disabled in this room.' };
        }
        const used = this.state.skipsUsed[targetPlayer.id] ?? 0;
        if (used >= ctx.settings.maxSkips) {
          return { ok: false, error: 'Maximum skips reached for this player.' };
        }
        this.state.skipsUsed[targetPlayer.id] = used + 1;
      }

      const choice = this.state.choice ?? 'truth';
      const points =
        action === 'complete' && ctx.settings.enableScoring
          ? choice === 'dare'
            ? 15
            : 10
          : 0;

      if (points > 0) {
        ctx.awardScore(targetPlayer.id, points);
      }

      this.state.lastOutcome = {
        playerId: targetPlayer.id,
        playerName: targetPlayer.nickname,
        choice,
        outcome: action === 'complete' ? 'completed' : action === 'skip' ? 'skipped' : 'passed',
        pointsAwarded: points,
      };
      this.state.phase = 'round-summary';
      this.state.endsAt = null;
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'next-round') {
      if (!player.isHost && this.state.activePlayerId !== playerId) {
        return { ok: false, error: 'Only the host or active player can advance.' };
      }
      if (this.state.round >= this.state.totalRounds) {
        this.state.phase = 'finished';
        ctx.broadcastState(this.getPublicState());
        ctx.finishGame({
          gameId: 'truth-dare',
          gameName: 'Classic Truth or Dare',
          rankings: buildRankings(ctx.players, 'Daredevil'),
          highlights: [
            {
              title: 'Rounds Completed',
              description: `${this.state.round} rounds of Truth or Dare played.`,
            },
          ],
          endedAt: Date.now(),
        });
        return { ok: true };
      }

      const nextPlayer = this.pickNextPlayer(ctx);
      this.state.round += 1;
      this.state.phase = 'choosing-type';
      this.state.activePlayerId = nextPlayer?.id ?? null;
      this.state.choice = null;
      this.state.currentPrompt = null;
      this.state.endsAt = Date.now() + ctx.settings.timerSeconds * 1000;
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    if (action === 'approve-submission' || action === 'reject-submission') {
      if (!player.isHost) {
        return { ok: false, error: 'Only the host can moderate submissions.' };
      }
      const promptId = (data as { promptId?: string })?.promptId;
      const idx = this.customPrompts.findIndex((p) => p.id === promptId);
      if (idx === -1) return { ok: false, error: 'Submission not found.' };
      if (action === 'approve-submission') {
        this.customPrompts[idx].approved = true;
      } else {
        this.customPrompts.splice(idx, 1);
      }
      ctx.broadcastState(this.getPublicState());
      return { ok: true };
    }

    return { ok: false, error: `Unknown action: ${action}` };
  }

  handleSubmit(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string } {
    if (!ctx.settings.allowPlayerSubmissions) {
      return { ok: false, error: 'Player submissions are disabled in this room.' };
    }
    const parsed = truthDareSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid submission.' };
    }
    const safety = isContentSafe(parsed.data.text);
    if (!safety.safe) {
      return { ok: false, error: safety.reason };
    }

    const player = ctx.players.find((p) => p.id === playerId);
    const autoApprove = !ctx.settings.requireHostApproval || Boolean(player?.isHost);

    this.customPrompts.push({
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      type: parsed.data.type,
      text: sanitizeText(parsed.data.text),
      category: parsed.data.category,
      intensity: parsed.data.intensity,
      source: player?.isHost ? 'host' : 'player',
      approved: autoApprove,
    });

    ctx.broadcastState(this.getPublicState());
    return { ok: true };
  }

  private pickNextPlayer(ctx: GameRuntimeContext) {
    const eligible = ctx.players.filter((p) => p.presence !== 'disconnected');
    const pool = eligible.length > 0 ? eligible : ctx.players;
    const withoutLast = pool.filter((p) => p.id !== this.lastPlayerId);
    const candidates = withoutLast.length > 0 ? withoutLast : pool;
    const chosen = candidates[crypto.randomInt(0, candidates.length)] ?? null;
    this.lastPlayerId = chosen?.id ?? null;
    return chosen;
  }

  private pickPrompt(ctx: GameRuntimeContext, choice: 'truth' | 'dare'): TruthDarePromptItem {
    const all = [...this.customPrompts, ...BUILTIN_TRUTH_DARE_PROMPTS].filter(
      (p) => p.type === choice && p.approved
    );
    const filtered = filterPromptsBySettings(all, ctx.settings.intensity, ctx.settings.categories);
    const unused = filtered.filter((p) => !this.usedPromptIds.has(p.id));
    const pool = unused.length > 0 ? unused : filtered;
    const picked = pool[crypto.randomInt(0, pool.length)];
    if (picked) {
      this.usedPromptIds.add(picked.id);
      return picked;
    }
    return {
      id: 'fallback',
      type: choice,
      text:
        choice === 'truth'
          ? 'What is one thing you are grateful for today?'
          : 'Give a high-five or kind shoutout to everyone in the room.',
      category: 'lighthearted',
      intensity: 'chill',
      source: 'builtin',
      approved: true,
    };
  }
}
