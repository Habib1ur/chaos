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
    timerSeconds: 0,
    anonymousMessagesPerPlayer: 3,
    anonymousMode: 'classic',
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

    // Player 1 guesses Player 2 correctly (liveVotes updates immediately)
    expect(engine.handleVote(ctx, 'p1', { targetPlayerId: 'p2' }).ok).toBe(true);
    expect(engine.getPublicState('p1').liveVotes['p2']).toEqual(['p1']);
    expect(engine.getPublicState('p1').endsAt).toBeNull(); // untimed mode!
    // Duplicate guess blocked
    expect(engine.handleVote(ctx, 'p1', { targetPlayerId: 'p3' }).ok).toBe(false);

    // Author p2 casts a bluff vote (allowed, but earns 0 guess points)
    expect(engine.handleVote(ctx, 'p2', { targetPlayerId: 'p3' }).ok).toBe(true);

    // Reveal answer awards 100 pts to p1 and 0 guess pts to p2
    expect(engine.handleAction(ctx, 'p1', 'reveal-answer').ok).toBe(true);
    const revealState = engine.getPublicState('p1');
    expect(revealState.phase).toBe('reveal');
    expect(revealState.currentStatement?.authorId).toBe('p2');
    expect(ctx.players.find((p) => p.id === 'p1')!.score).toBe(100);
    expect(ctx.players.find((p) => p.id === 'p2')!.score).toBe(0);
    expect(revealState.roundPoints?.['p2']?.label).toBe('Bluff Vote (0 pts)');
  });

  it('awards 1.5x speed multiplier when timed and auto-reveals when all players vote', () => {
    const engine = new WhoSaidThatEngine();
    const { ctx } = makeAnonContext();
    ctx.settings.timerSeconds = 30;

    engine.start(ctx);
    engine.handleSubmit(ctx, 'p2', { text: 'Timed speed test statement!', category: 'funny' });
    engine.handleAction(ctx, 'p1', 'start-guessing');

    engine.handleVote(ctx, 'p1', { targetPlayerId: 'p2' });
    engine.handleVote(ctx, 'p2', { targetPlayerId: 'p3' });
    // 3rd player votes -> all 3 voted -> instant auto-reveal!
    engine.handleVote(ctx, 'p3', { targetPlayerId: 'p2' });

    const state = engine.getPublicState('p1');
    expect(state.phase).toBe('reveal');
    expect(ctx.players.find((p) => p.id === 'p1')!.score).toBe(150);
    expect(ctx.players.find((p) => p.id === 'p2')!.score).toBe(0);
    engine.cleanup();
  });
});
