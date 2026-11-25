import crypto from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  chatMessageSchema,
  createRoomSchema,
  GAME_CATALOG,
  GAME_IDS,
  joinRoomSchema,
  reactionSchema,
  reportSchema,
  updateRoomSettingsSchema,
  type ChatMessage,
  type ClientToServerEvents,
  type GameId,
  type ServerToClientEvents,
} from '@chaos/shared';
import { createEngineForGame, type InternalRoom, type RoomManager } from '../rooms/roomManager';
import { KingsGameEngine } from '../games/kings-game/kingsGameEngine';
import { isContentSafe, sanitizeText } from '../utils/moderation';

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedIO, roomManager: RoomManager) {
  const emitters = {
    sendPrivateToPlayer: (socketId: string, event: string, payload: unknown) => {
      io.to(socketId).emit(event as keyof ServerToClientEvents, payload as never);
    },
    broadcastToRoom: (code: string, event: string, payload: unknown) => {
      io.to(code).emit(event as keyof ServerToClientEvents, payload as never);
    },
  };

  const emitSystemChat = (internal: InternalRoom, content: string) => {
    const msg: ChatMessage = {
      id: `sys-${crypto.randomUUID().slice(0, 8)}`,
      roomId: internal.state.id,
      senderId: null,
      senderName: 'CHAOS',
      senderAvatar: 'crown',
      content,
      type: 'system',
      timestamp: Date.now(),
    };
    internal.chatHistory.push(msg);
    if (internal.chatHistory.length > 100) internal.chatHistory.shift();
    io.to(internal.state.code).emit('chat:message', msg);
  };

  io.on('connection', (socket: TypedSocket) => {
    socket.on('room:create', (payload, cb) => {
      const parsed = createRoomSchema.safeParse(payload);
      if (!parsed.success) {
        cb({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid room settings.' });
        return;
      }

      const result = roomManager.createRoom({
        ...parsed.data,
        socketId: socket.id,
      });

      socket.join(result.room.code);
      cb({ ok: true, data: result });
    });

    socket.on('room:join', (payload, cb) => {
      const parsed = joinRoomSchema.safeParse(payload);
      if (!parsed.success) {
        cb({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid join request.' });
        return;
      }

      const result = roomManager.joinRoom({
        ...parsed.data,
        socketId: socket.id,
      });

      if (!result.ok) {
        cb({ ok: false, error: result.error });
        return;
      }

      socket.join(result.room.code);
      const joinedPlayer = result.room.players.find((p) => p.id === result.playerId);
      if (joinedPlayer) {
        socket.to(result.room.code).emit('room:player:joined', joinedPlayer);
      }
      io.to(result.room.code).emit('room:updated', result.room);
      const internal = roomManager.getByCode(result.room.code);
      if (internal && joinedPlayer) {
        emitSystemChat(internal, `${joinedPlayer.nickname} joined the room.`);
      }
      cb({
        ok: true,
        data: {
          room: result.room,
          playerId: result.playerId,
          sessionToken: result.sessionToken,
        },
      });
    });

    socket.on('player:reconnect', (payload, cb) => {
      if (!payload?.roomCode || !payload?.sessionToken) {
        cb({ ok: false, error: 'Missing reconnection credentials.' });
        return;
      }
      const res = roomManager.reconnectPlayer(payload.roomCode, payload.sessionToken, socket.id);
      if (!res.ok) {
        cb({ ok: false, error: res.error });
        return;
      }
      socket.join(res.room.state.code);
      io.to(res.room.state.code).emit('room:updated', res.room.state);

      let kingsPrivate = null;
      if (res.room.engine instanceof KingsGameEngine) {
        kingsPrivate = res.room.engine.getPrivateState(res.playerId);
      }

      cb({
        ok: true,
        data: {
          room: res.room.state,
          playerId: res.playerId,
          gameState: res.gameState,
          kingsPrivate,
        },
      });
    });

    socket.on('room:ready', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      const player = ctx.internal.state.players.find((p) => p.id === ctx.playerId);
      if (!player) return;
      player.isReady = Boolean(payload?.isReady);
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('room:profile:update', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      const player = ctx.internal.state.players.find((p) => p.id === ctx.playerId);
      if (!player) return;
      if (payload.nickname && payload.nickname.trim().length >= 2) {
        player.nickname = sanitizeText(payload.nickname).slice(0, 24);
      }
      if (payload.avatarId) {
        player.avatarId = payload.avatarId;
      }
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('room:settings:update', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can update room settings.' });
        return;
      }
      const parsed = updateRoomSettingsSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid room settings.' });
        return;
      }
      ctx.internal.state.settings = {
        ...ctx.internal.state.settings,
        ...parsed.data,
      };
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('room:host:transfer', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can transfer host permissions.' });
        return;
      }
      const target = ctx.internal.state.players.find((p) => p.id === payload.targetPlayerId);
      if (!target) {
        cb?.({ ok: false, error: 'Target player not found.' });
        return;
      }
      for (const p of ctx.internal.state.players) {
        p.isHost = p.id === target.id;
      }
      ctx.internal.state.hostId = target.id;
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      emitSystemChat(ctx.internal, `${target.nickname} is now the room host.`);
      cb?.({ ok: true });
    });

    socket.on('room:kick', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can remove players.' });
        return;
      }
      if (payload.targetPlayerId === ctx.playerId) {
        cb?.({ ok: false, error: 'You cannot kick yourself.' });
        return;
      }
      const targetSocketId = ctx.internal.playerSockets.get(payload.targetPlayerId);
      const targetPlayer = ctx.internal.state.players.find((p) => p.id === payload.targetPlayerId);
      const removed = roomManager.removePlayer(ctx.internal.state.code, payload.targetPlayerId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('room:kicked', { reason: 'Removed by the room host.' });
        io.sockets.sockets.get(targetSocketId)?.leave(ctx.internal.state.code);
      }
      if (removed && !removed.deletedRoom) {
        io.to(ctx.internal.state.code).emit('room:updated', removed.internal.state);
        if (targetPlayer) {
          emitSystemChat(removed.internal, `${targetPlayer.nickname} was removed from the room.`);
        }
      }
      cb?.({ ok: true });
    });

    socket.on('room:leave', (cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: true });
        return;
      }
      const leavingPlayer = ctx.internal.state.players.find((p) => p.id === ctx.playerId);
      socket.leave(ctx.internal.state.code);
      const removed = roomManager.removePlayer(ctx.internal.state.code, ctx.playerId);
      if (removed && !removed.deletedRoom) {
        io.to(ctx.internal.state.code).emit('room:player:left', {
          playerId: ctx.playerId,
          nickname: leavingPlayer?.nickname ?? 'Player',
        });
        io.to(ctx.internal.state.code).emit('room:updated', removed.internal.state);
        if (leavingPlayer) {
          emitSystemChat(removed.internal, `${leavingPlayer.nickname} left the room.`);
        }
      }
      cb?.({ ok: true });
    });

    socket.on('game:select', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can select the game.' });
        return;
      }
      if (!GAME_IDS.includes(payload.gameId)) {
        cb?.({ ok: false, error: 'Unsupported game ID.' });
        return;
      }
      ctx.internal.state.selectedGame = payload.gameId as GameId;
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('game:start', (cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can start the game.' });
        return;
      }
      const gameMeta = GAME_CATALOG.find((g) => g.id === ctx.internal.state.selectedGame);
      const minPlayers = gameMeta?.minPlayers ?? 2;
      if (ctx.internal.state.players.length < minPlayers) {
        cb?.({
          ok: false,
          error: `${gameMeta?.name ?? 'This game'} requires at least ${minPlayers} players.`,
        });
        return;
      }

      const engine = createEngineForGame(ctx.internal.state.selectedGame);
      ctx.internal.engine = engine;
      ctx.internal.state.status = 'playing';
      for (const p of ctx.internal.state.players) {
        p.presence = 'playing';
      }

      const gameCtx = roomManager.buildGameContext(ctx.internal, emitters);
      const initialState = engine.start(gameCtx);

      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      io.to(ctx.internal.state.code).emit('game:started', initialState);
      emitSystemChat(ctx.internal, `Started ${gameMeta?.name ?? ctx.internal.state.selectedGame}!`);
      cb?.({ ok: true });
    });

    socket.on('game:end', (cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can end the game.' });
        return;
      }
      ctx.internal.state.status = 'lobby';
      ctx.internal.engine?.cleanup?.();
      ctx.internal.engine = null;
      for (const p of ctx.internal.state.players) {
        p.presence = 'online';
      }
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('game:return-lobby', (cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      if (ctx.internal.state.hostId !== ctx.playerId) {
        cb?.({ ok: false, error: 'Only the host can return the room to lobby.' });
        return;
      }
      ctx.internal.state.status = 'lobby';
      ctx.internal.engine?.cleanup?.();
      ctx.internal.engine = null;
      for (const p of ctx.internal.state.players) {
        p.presence = 'online';
      }
      io.to(ctx.internal.state.code).emit('room:updated', ctx.internal.state);
      cb?.({ ok: true });
    });

    socket.on('game:action', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx || !ctx.internal.engine) {
        cb?.({ ok: false, error: 'No active game.' });
        return;
      }
      const gameCtx = roomManager.buildGameContext(ctx.internal, emitters);
      const res = ctx.internal.engine.handleAction(gameCtx, ctx.playerId, payload.action, payload.data);
      cb?.(res);
    });

    socket.on('game:submit', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx || !ctx.internal.engine?.handleSubmit) {
        cb?.({ ok: false, error: 'Submissions are not active.' });
        return;
      }
      const gameCtx = roomManager.buildGameContext(ctx.internal, emitters);
      const res = ctx.internal.engine.handleSubmit(gameCtx, ctx.playerId, payload);
      cb?.(res);
    });

    socket.on('game:vote', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx || !ctx.internal.engine?.handleVote) {
        cb?.({ ok: false, error: 'Voting is not active.' });
        return;
      }
      const gameCtx = roomManager.buildGameContext(ctx.internal, emitters);
      const res = ctx.internal.engine.handleVote(gameCtx, ctx.playerId, payload);
      cb?.(res);
    });

    socket.on('chat:send', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) {
        cb?.({ ok: false, error: 'Not in a room.' });
        return;
      }
      if (!ctx.internal.state.settings.enableChat) {
        cb?.({ ok: false, error: 'Chat is disabled in this room.' });
        return;
      }
      if (!roomManager.chatLimiter.allow(ctx.playerId)) {
        cb?.({ ok: false, error: 'You are sending messages too fast.' });
        return;
      }
      const parsed = chatMessageSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Message cannot be empty.' });
        return;
      }
      const safety = isContentSafe(parsed.data.content);
      if (!safety.safe) {
        cb?.({ ok: false, error: safety.reason });
        return;
      }
      const player = ctx.internal.state.players.find((p) => p.id === ctx.playerId);
      if (!player) return;

      const msg: ChatMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        roomId: ctx.internal.state.id,
        senderId: player.id,
        senderName: player.nickname,
        senderAvatar: player.avatarId,
        content: sanitizeText(parsed.data.content),
        type: 'user',
        timestamp: Date.now(),
      };
      ctx.internal.chatHistory.push(msg);
      if (ctx.internal.chatHistory.length > 100) ctx.internal.chatHistory.shift();
      io.to(ctx.internal.state.code).emit('chat:message', msg);
      cb?.({ ok: true });
    });

    socket.on('reaction:send', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      if (!roomManager.reactionLimiter.allow(ctx.playerId)) {
        cb?.({ ok: false, error: 'Too many reactions.' });
        return;
      }
      const parsed = reactionSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid reaction.' });
        return;
      }
      const player = ctx.internal.state.players.find((p) => p.id === ctx.playerId);
      if (!player) return;

      io.to(ctx.internal.state.code).emit('reaction:received', {
        id: `rx-${crypto.randomUUID().slice(0, 8)}`,
        playerId: player.id,
        playerName: player.nickname,
        emoji: parsed.data.emoji,
        timestamp: Date.now(),
      });
      cb?.({ ok: true });
    });

    socket.on('submission:report', (payload, cb) => {
      const ctx = roomManager.getBySocket(socket.id);
      if (!ctx) return;
      const parsed = reportSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid report.' });
        return;
      }
      emitSystemChat(
        ctx.internal,
        `A safety report was submitted and flagged for host/platform moderation.`
      );
      cb?.({ ok: true });
    });

    socket.on('disconnect', () => {
      const disconnected = roomManager.markDisconnected(socket.id);
      if (disconnected) {
        io.to(disconnected.internal.state.code).emit(
          'room:updated',
          disconnected.internal.state
        );
      }
    });
  });
}
