import { describe, expect, it } from 'vitest';
import { KingsGameEngine } from '../src/games/kings-game/kingsGameEngine';
import type { GameRuntimeContext } from '../src/games/engine';
import type { KingsPrivateState, PlayerInfo, RoomSettings } from '@chaos/shared';

function makeKingsContext() {
  const players: PlayerInfo[] = ['Alice', 'Bob', 'Charlie'].map((name, i) => ({
    id: `p${i + 1}`,
    sessionId: `s${i + 1}`,
    nickname: name,
    avatarId: 'fox',
    isHost: i === 0,
    isReady: true,
    isGuest: true,
    presence: 'playing',
    score: 0,
    joinedAt: Date.now(),
  }));

  const privateMessages = new Map<string, KingsPrivateState>();

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
    anonymousMessagesPerPlayer: 2,
    anonymousMode: 'classic',
    revealAuthorsInAnonymous: true,
    noConsecutiveKing: true,
  };

  const ctx: GameRuntimeContext = {
    roomId: 'r-king',
    roomCode: 'KING01',
    settings,
    players,
    awardScore: (id, delta) => {
      const p = players.find((x) => x.id === id);
      if (p) p.score += delta;
    },
    sendPrivateToPlayer: (id, _event, payload) => {
      privateMessages.set(id, payload as KingsPrivateState);
    },
    broadcastState: () => { },
    finishGame: () => { },
  };

  return { ctx, players, privateMessages };
}

describe('KingsGameEngine', () => {
  it('supports Coup Dares, anonymous numbering, Prompt-First reveal, unmasking, Joint Missions, and King Twist', () => {
    const engine = new KingsGameEngine();
    const { ctx, players, privateMessages } = makeKingsContext();

    const startState = engine.start(ctx);
    expect(startState.phase).toBe('coup-dares');
    expect(startState.numberSlots.length).toBe(3);

    // Every player seals a secret Coup Dare (auto-advances to king-announced on 3rd)
    expect(engine.handleSubmit(ctx, 'p1', { text: 'Sing a royal ballad!' }).ok).toBe(true);
    expect(engine.handleSubmit(ctx, 'p2', { text: '' }).ok).toBe(true); // blank -> auto-generated
    expect(engine.handleSubmit(ctx, 'p3', { text: 'Do 5 dramatic squats!' }).ok).toBe(true);

    const afterDares = engine.getPublicState();
    expect(afterDares.phase).toBe('shuffling');
    expect(afterDares.kingPlayerId).toBeTruthy();

    expect(engine.handleAction(ctx, 'p1', 'skip-shuffle').ok).toBe(true);
    const kingAnnounced = engine.getPublicState();
    expect(kingAnnounced.phase).toBe('king-announced');

    const kingId = kingAnnounced.kingPlayerId!;
    const nonKingId = players.find((p) => p.id !== kingId)!.id;
    const kingPriv = privateMessages.get(kingId)!;
    const nonKingPriv = privateMessages.get(nonKingId)!;

    expect(kingPriv.isKing).toBe(true);
    expect(kingPriv.draftSlots?.length).toBe(2);
    expect(nonKingPriv.isKing).toBe(false);
    expect(nonKingPriv.draftSlots).toBeUndefined();

    const targets = kingPriv.draftSlots!;

    // Non-king cannot submit decrees
    const unauthorized = engine.handleSubmit(ctx, nonKingId, {
      assignments: targets.map((t) => ({
        targetNumber: t.number,
        type: 'truth',
        text: 'Unauthorized test prompt',
      })),
    });
    expect(unauthorized.ok).toBe(false);

    // King submits valid decrees with a Joint Mission and Star Pick
    const okSub = engine.handleSubmit(ctx, kingId, {
      assignments: [
        {
          targetNumber: targets[0].number,
          jointTargetNumber: targets[1].number,
          type: 'dare',
          level: 'funny',
          isStarPick: true,
          text: `Joint dare for #${targets[0].number} and #${targets[1].number}`,
        },
        {
          targetNumber: targets[1].number,
          type: 'truth',
          level: 'chill',
          isStarPick: false,
          text: `Secret truth for #${targets[1].number}`,
        },
      ],
    });
    expect(okSub.ok).toBe(true);

    // Prompt-First Reveal: targetPlayerId & targetPlayerName MUST be null before unmasking
    const firstReveal = engine.getPublicState();
    expect(firstReveal.phase).toBe('revealing');
    expect(firstReveal.revealedAssignments.length).toBe(1);
    expect(firstReveal.revealedAssignments[0].unmasked).toBe(false);
    expect(firstReveal.revealedAssignments[0].targetPlayerId).toBeNull();
    expect(firstReveal.revealedAssignments[0].targetPlayerName).toBeNull();

    // Unmask current slot (includes target & joint partner avatars/names)
    expect(engine.handleAction(ctx, kingId, 'unmask-current').ok).toBe(true);
    const unmasked = engine.getPublicState();
    expect(unmasked.revealedAssignments[0].unmasked).toBe(true);
    expect(unmasked.revealedAssignments[0].targetPlayerName).toBeTruthy();
    expect(unmasked.revealedAssignments[0].targetPlayerAvatar).toBeTruthy();
    if (unmasked.revealedAssignments[0].jointTargetNumber) {
      expect(unmasked.revealedAssignments[0].jointTargetPlayerName).toBeTruthy();
      expect(unmasked.revealedAssignments[0].jointTargetPlayerAvatar).toBeTruthy();
    }

    // Resolve as creative (+20)
    expect(
      engine.handleAction(ctx, kingId, 'resolve-assignment', { outcome: 'creative' }).ok
    ).toBe(true);

    // Reveal 2nd slot -> unmask -> trigger King Twist
    expect(engine.handleAction(ctx, kingId, 'reveal-next').ok).toBe(true);
    expect(engine.handleAction(ctx, kingId, 'unmask-current').ok).toBe(true);
    expect(engine.handleAction(ctx, kingId, 'reveal-next').ok).toBe(true);

    const twistState = engine.getPublicState();
    expect(twistState.phase).toBe('king-twist');
    expect(twistState.kingTwist?.text).toBeTruthy();

    // King completes the Coup Dare (+25)
    expect(
      engine.handleAction(ctx, kingId, 'resolve-king-twist', { outcome: 'completed' }).ok
    ).toBe(true);
    expect(players.find((p) => p.id === kingId)!.score).toBe(25);
  });
});
