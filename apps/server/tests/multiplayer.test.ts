import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioc, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@chaos/shared';
import { createChaosServer } from '../src/index';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Multiplayer Socket.IO Integration', () => {
  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const { server } = createChaosServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 4001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
    closeServer = () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
  });

  afterAll(async () => {
    await closeServer();
  });

  it('supports room creation, joining, host permissions, room isolation, and reconnection', async () => {
    const hostSocket: ClientSocket = ioc(baseUrl, { transports: ['websocket'] });
    const guestSocket: ClientSocket = ioc(baseUrl, { transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((r) => hostSocket.on('connect', () => r())),
      new Promise<void>((r) => guestSocket.on('connect', () => r())),
    ]);

    const created = await new Promise<{
      ok: boolean;
      data?: { room: { code: string }; playerId: string; sessionToken: string };
    }>((resolve) => {
      hostSocket.emit(
        'room:create',
        {
          roomName: 'Test Party',
          nickname: 'HostAlice',
          avatarId: 'fox',
          selectedGame: 'truth-dare',
          visibility: 'private',
          maxPlayers: 8,
          intensity: 'chill',
          categories: ['funny'],
        },
        (res) => resolve(res)
      );
    });

    expect(created.ok).toBe(true);
    const roomCode = created.data!.room.code;

    const joined = await new Promise<{
      ok: boolean;
      data?: { room: { players: unknown[] }; playerId: string; sessionToken: string };
    }>((resolve) => {
      guestSocket.emit(
        'room:join',
        { code: roomCode, nickname: 'GuestBob', avatarId: 'ghost' },
        (res) => resolve(res)
      );
    });

    expect(joined.ok).toBe(true);
    expect(joined.data!.room.players.length).toBe(2);

    // Non-host cannot start game
    const nonHostStart = await new Promise<{ ok: boolean }>((resolve) => {
      guestSocket.emit('game:start', (res) => resolve(res));
    });
    expect(nonHostStart.ok).toBe(false);

    // Host starts game
    const hostStart = await new Promise<{ ok: boolean }>((resolve) => {
      hostSocket.emit('game:start', (res) => resolve(res));
    });
    expect(hostStart.ok).toBe(true);

    // Reconnection with sessionToken restores state
    const guestToken = joined.data!.sessionToken;
    guestSocket.disconnect();

    const reconnectedSocket: ClientSocket = ioc(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((r) => reconnectedSocket.on('connect', () => r()));

    const reconRes = await new Promise<{
      ok: boolean;
      data?: { playerId: string; gameState: { gameId: string } | null };
    }>((resolve) => {
      reconnectedSocket.emit(
        'player:reconnect',
        { roomCode, sessionToken: guestToken },
        (res) => resolve(res)
      );
    });

    expect(reconRes.ok).toBe(true);
    expect(reconRes.data?.playerId).toBe(joined.data!.playerId);
    expect(reconRes.data?.gameState?.gameId).toBe('truth-dare');

    hostSocket.disconnect();
    reconnectedSocket.disconnect();
  });
});
