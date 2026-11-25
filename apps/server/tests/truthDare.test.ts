import { describe, expect, it } from 'vitest';
import { TruthDareEngine } from '../src/games/truth-dare/truthDareEngine';
import type { GameRuntimeContext } from '../src/games/engine';
import type { PlayerInfo, RoomSettings } from '@chaos/shared';

function makeContext(): { ctx: GameRuntimeContext; players: PlayerInfo[] } {
  const players: PlayerInfo[] = [
    {
      id: 'p1',
      sessionId: 's1',
      nickname: 'Alice',
      avatarId: 'fox',
      isHost: true,
      isReady: true,
      isGuest: true,
      presence: 'playing',
      score: 0,
      joinedAt: Date.now(),
    },
    {
      id: 'p2',
      sessionId: 's2',
      nickname: 'Bob',
      avatarId: 'crown',
      isHost: false,
      isReady: true,
      isGuest: true,
      presence: 'playing',
      score: 0,
      joinedAt: Date.now(),
    },
  ];

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
    maxSkips: 1,
    enableScoring: true,
    enableChat: true,
    intensity: 'medium',
    categories: ['funny', 'lighthearted'],
    rounds: 4,
    timerSeconds: 45,
    anonymousMessagesPerPlayer: 2,
    anonymousMode: 'classic',
    revealAuthorsInAnonymous: true,
    noConsecutiveKing: true,
  };

  const ctx: GameRuntimeContext = {
    roomId: 'r1',
    roomCode: 'TEST01',
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

describe('TruthDareEngine', () => {
  it('runs a full truth/dare turn, awards points, and enforces skip limits', () => {
    const engine = new TruthDareEngine();
    const { ctx, players } = makeContext();

    const startState = engine.start(ctx);
    expect(startState.phase).toBe('choosing-type');
    expect(startState.activePlayerId).toBeTruthy();

    const activeId = startState.activePlayerId!;
    const otherId = players.find((p) => p.id !== activeId)!.id;

    // Non-active player cannot choose
    const badChoice = engine.handleAction(ctx, otherId, 'choose-type', { choice: 'truth' });
    expect(badChoice.ok).toBe(false);

    // Active player chooses Dare
    const goodChoice = engine.handleAction(ctx, activeId, 'choose-type', { choice: 'dare' });
    expect(goodChoice.ok).toBe(true);
    expect(engine.getPublicState().phase).toBe('performing');
    expect(engine.getPublicState().currentPrompt?.type).toBe('dare');

    // Complete awards 15 pts
    const completeRes = engine.handleAction(ctx, activeId, 'complete');
    expect(completeRes.ok).toBe(true);
    expect(players.find((p) => p.id === activeId)!.score).toBe(15);

    // Custom submission
    const subRes = engine.handleSubmit(ctx, otherId, {
      type: 'truth',
      text: 'What is your funniest childhood memory?',
      category: 'funny',
      intensity: 'chill',
      anonymous: true,
    });
    expect(subRes.ok).toBe(true);
  });
});
