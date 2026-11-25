import { describe, expect, it } from 'vitest';
import { WhoSaidThatEngine } from '../src/games/who-said-that/whoSaidThatEngine';
import type { GameRuntimeContext } from '../src/games/engine';
import type { PlayerInfo, RoomSettings } from '@chaos/shared';

function makeAnonContext() {
  const players: PlayerInfo[] = ['Alice', 'Bob', 'Charlie'].map((name, i) => ({
    id: `p${i + 1}`,
    sessionId: `s${i + 1}`,
    nickname: name,
    avatarId: 'ghost',
    isHost: i === 0,
    isReady: true,
    isGuest: true,
    presence: 'playing',
    score: 0,
    joinedAt: Date.now(),
  }));

  const settings: RoomSettings = {
    visibility: 'private',
    maxPlayers: 12,
    hasPassword: false,
    isLocked: false,
    allowGuestJoin: true,
    allowPlayerSubmissions: true,
    requireHostApproval: false,
    allowAnonymousSubmissions: true,
    allowSkip: true,
    maxSkips: 2,
    enableScoring: true,
    enableChat: true,
    intensity: 'medium',
    categories: ['funny'],
    rounds: 3,
    timerSeconds: 45,
    revealAuthorsInAnonymous: true,
    noConsecutiveKing: true,
  };

  const ctx: GameRuntimeContext = {
    roomId: 'r-anon',
    roomCode: 'ANON01',
    settings,
    players,
    awardScore: (id, delta) => {
      const p = players.find((x) => x.id === id);
      if (p) p.score += delta;
    },
    sendPrivateToPlayer: () => {},
    broadcastState: () => {},
    finishGame: () => {},
  };

  return { ctx, players };
}

describe('WhoSaidThatEngine', () => {
  it('never leaks authorId or authorName during submitting or guessing phases', () => {
    const engine = new WhoSaidThatEngine();
    const { ctx } = makeAnonContext();

    engine.start(ctx);
    expect(engine.handleSubmit(ctx, 'p2', { text: 'I secretly love pineapple pizza.', category: 'funny' }).ok).toBe(
      true
    );

    // Start guessing
    expect(engine.handleAction(ctx, 'p1', 'start-guessing').ok).toBe(true);
    const guessingState = engine.getPublicState('p1');
    expect(guessingState.phase).toBe('guessing');
    expect(guessingState.currentStatement).toBeTruthy();
    expect(guessingState.currentStatement?.authorId).toBeUndefined();
    expect(guessingState.currentStatement?.authorName).toBeUndefined();

    // Player 1 guesses Player 2 correctly
    expect(engine.handleVote(ctx, 'p1', { targetPlayerId: 'p2' }).ok).toBe(true);
    // Duplicate guess blocked
    expect(engine.handleVote(ctx, 'p1', { targetPlayerId: 'p3' }).ok).toBe(false);

    // Reveal answer awards 100 pts to p1
    expect(engine.handleAction(ctx, 'p1', 'reveal-answer').ok).toBe(true);
    const revealState = engine.getPublicState('p1');
    expect(revealState.phase).toBe('reveal');
    expect(revealState.currentStatement?.authorId).toBe('p2');
    expect(ctx.players.find((p) => p.id === 'p1')!.score).toBe(100);
  });
});
