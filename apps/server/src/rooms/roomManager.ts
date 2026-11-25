import crypto from 'node:crypto';
import type {
  ActiveGameState,
  ChatMessage,
  GameId,
  GameResultSummary,
  PlayerInfo,
  RoomSettings,
  RoomState,
} from '@chaos/shared';
import { ROOM_DEFAULTS } from '@chaos/shared';
import type { GameEngine, GameRuntimeContext } from '../games/engine';
import { TruthDareEngine } from '../games/truth-dare/truthDareEngine';
import { KingsGameEngine } from '../games/kings-game/kingsGameEngine';
import { WhoSaidThatEngine } from '../games/who-said-that/whoSaidThatEngine';
import { PartyGamesEngine } from '../games/party-games/partyGamesEngine';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../utils/crypto';
import { SlidingWindowLimiter } from '../utils/moderation';
import { prisma } from '../db/prisma';

export interface InternalRoom {
  state: RoomState;
  passwordHash: string | null;
  engine: GameEngine | null;
  lastResults: GameResultSummary | null;
  chatHistory: ChatMessage[];
  /** sessionToken -> playerId */
  sessionToPlayer: Map<string, string>;
  /** playerId -> socketId */
  playerSockets: Map<string, string>;
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

export function createEngineForGame(gameId: GameId): GameEngine {
  switch (gameId) {
    case 'truth-dare':
      return new TruthDareEngine();
    case 'kings-game':
      return new KingsGameEngine();
    case 'who-said-that':
      return new WhoSaidThatEngine();
    default:
      return new PartyGamesEngine(gameId);
  }
}

export class RoomManager {
  private roomsByCode = new Map<string, InternalRoom>();
  private socketToRoom = new Map<string, { code: string; playerId: string }>();
  public readonly chatLimiter = new SlidingWindowLimiter(12, 10_000);
  public readonly reactionLimiter = new SlidingWindowLimiter(10, 5_000);

  createRoom(params: {
    roomName: string;
    nickname: string;
    avatarId: string;
    selectedGame: GameId;
    visibility: RoomSettings['visibility'];
    password?: string;
    maxPlayers: number;
    intensity: RoomSettings['intensity'];
    timerSeconds?: number;
    anonymousMode?: 'classic' | 'spotlight';
    anonymousMessagesPerPlayer?: number;
    categories: RoomSettings['categories'];
    socketId: string;
    userId?: string | null;
  }): { room: RoomState; playerId: string; sessionToken: string } {
    let code = generateRoomCode();
    while (this.roomsByCode.has(code)) {
      code = generateRoomCode();
    }

    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const playerId = `pl-${crypto.randomUUID().slice(0, 8)}`;
    const sessionId = crypto.randomUUID();

    const player: PlayerInfo = {
      id: playerId,
      sessionId,
      userId: params.userId ?? null,
      nickname: params.nickname,
      avatarId: params.avatarId,
      isHost: true,
      isReady: true,
      isGuest: !params.userId,
      presence: 'online',
      score: 0,
      joinedAt: Date.now(),
    };

    const settings: RoomSettings = {
      visibility: params.visibility,
      maxPlayers: params.maxPlayers,
      hasPassword: Boolean(params.password && params.password.length > 0),
      isLocked: false,
      allowGuestJoin: true,
      allowPlayerSubmissions: true,
      requireHostApproval: false,
      allowAnonymousSubmissions: true,
      allowSkip: true,
      maxSkips: ROOM_DEFAULTS.maxSkips,
      enableScoring: true,
      enableChat: true,
      intensity: params.intensity,
      categories: params.categories,
      rounds: ROOM_DEFAULTS.rounds,
      timerSeconds: params.timerSeconds ?? ROOM_DEFAULTS.roundTimerSeconds,
      anonymousMessagesPerPlayer: params.anonymousMessagesPerPlayer ?? 2,
      anonymousMode: params.anonymousMode ?? 'classic',
      revealAuthorsInAnonymous: true,
      noConsecutiveKing: true,
    };

    const state: RoomState = {
      id: roomId,
      code,
      name: params.roomName,
      hostId: playerId,
      selectedGame: params.selectedGame,
      status: 'lobby',
      settings,
      players: [player],
      createdAt: Date.now(),
    };

    const internal: InternalRoom = {
      state,
      passwordHash: params.password ? hashPassword(params.password) : null,
      engine: null,
      lastResults: null,
      chatHistory: [],
      sessionToPlayer: new Map([[sessionId, playerId]]),
      playerSockets: new Map([[playerId, params.socketId]]),
    };

    this.roomsByCode.set(code, internal);
    this.socketToRoom.set(params.socketId, { code, playerId });

    if (prisma) {
      prisma.room
        .create({
          data: {
            id: roomId,
            code,
            name: params.roomName,
            visibility: params.visibility,
            passwordHash: internal.passwordHash,
            hostPlayerId: playerId,
            selectedGame: params.selectedGame,
            status: 'lobby',
            settingsJson: settings as unknown as object,
            members: {
              create: {
                playerId,
                userId: params.userId ?? null,
                nickname: params.nickname,
                avatarId: params.avatarId,
                isHost: true,
                score: 0,
              },
            },
          },
        })
        .catch((err) => console.error('[DB] Failed to persist room:', err));
    }

    const sessionToken = signToken({ roomCode: code, playerId, sessionId });
    return { room: state, playerId, sessionToken };
  }

  async hydrateRoomFromDb(code: string): Promise<InternalRoom | undefined> {
    const existing = this.roomsByCode.get(code.toUpperCase());
    if (existing) return existing;
    if (!prisma) return undefined;

    try {
      const dbRoom = await prisma.room.findUnique({
        where: { code: code.toUpperCase() },
        include: { members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
      });
      if (!dbRoom) return undefined;

      const settings = dbRoom.settingsJson as unknown as RoomSettings;
      const players: PlayerInfo[] = dbRoom.members.map((m) => ({
        id: m.playerId,
        sessionId: `restored-${m.playerId}`,
        userId: m.userId,
        nickname: m.nickname,
        avatarId: m.avatarId,
        isHost: m.isHost,
        isReady: m.isHost,
        isGuest: !m.userId,
        presence: 'disconnected',
        score: m.score,
        joinedAt: m.joinedAt.getTime(),
      }));

      const state: RoomState = {
        id: dbRoom.id,
        code: dbRoom.code,
        name: dbRoom.name,
        hostId: dbRoom.hostPlayerId,
        selectedGame: dbRoom.selectedGame as GameId,
        status: 'lobby',
        settings,
        players,
        createdAt: dbRoom.createdAt.getTime(),
      };

      const internal: InternalRoom = {
        state,
        passwordHash: dbRoom.passwordHash,
        engine: null,
        lastResults: null,
        chatHistory: [],
        sessionToPlayer: new Map(),
        playerSockets: new Map(),
      };
      this.roomsByCode.set(dbRoom.code, internal);
      return internal;
    } catch (err) {
      console.error('[DB] Failed to hydrate room:', err);
      return undefined;
    }
  }

  joinRoom(params: {
    code: string;
    nickname: string;
    avatarId: string;
    password?: string;
    socketId: string;
    userId?: string | null;
  }): { ok: true; room: RoomState; playerId: string; sessionToken: string } | { ok: false; error: string } {
    const internal = this.roomsByCode.get(params.code.toUpperCase());
    if (!internal) {
      return { ok: false, error: 'Room not found. Check the room code and try again.' };
    }
    if (internal.state.settings.isLocked) {
      return { ok: false, error: 'This room is currently locked by the host.' };
    }
    if (internal.state.players.length >= internal.state.settings.maxPlayers) {
      return { ok: false, error: 'This room is full.' };
    }
    if (internal.passwordHash) {
      if (!params.password || !verifyPassword(params.password, internal.passwordHash)) {
        return { ok: false, error: 'Incorrect room password.' };
      }
    }
    if (
      internal.state.players.some(
        (p) => p.nickname.toLowerCase() === params.nickname.toLowerCase()
      )
    ) {
      return { ok: false, error: 'That nickname is already taken in this room.' };
    }

    const playerId = `pl-${crypto.randomUUID().slice(0, 8)}`;
    const sessionId = crypto.randomUUID();
    const player: PlayerInfo = {
      id: playerId,
      sessionId,
      userId: params.userId ?? null,
      nickname: params.nickname,
      avatarId: params.avatarId,
      isHost: false,
      isReady: false,
      isGuest: !params.userId,
      presence: 'online',
      score: 0,
      joinedAt: Date.now(),
    };

    internal.state.players.push(player);
    internal.sessionToPlayer.set(sessionId, playerId);
    internal.playerSockets.set(playerId, params.socketId);
    this.socketToRoom.set(params.socketId, { code: internal.state.code, playerId });

    if (prisma) {
      prisma.roomMember
        .create({
          data: {
            roomId: internal.state.id,
            playerId,
            userId: params.userId ?? null,
            nickname: params.nickname,
            avatarId: params.avatarId,
            isHost: false,
            score: 0,
          },
        })
        .catch((err) => console.error('[DB] Failed to persist room member:', err));
    }

    const sessionToken = signToken({
      roomCode: internal.state.code,
      playerId,
      sessionId,
    });
    return { ok: true, room: internal.state, playerId, sessionToken };
  }

  reconnectPlayer(
    roomCode: string,
    sessionToken: string,
    socketId: string
  ):
    | {
        ok: true;
        room: InternalRoom;
        playerId: string;
        gameState: ActiveGameState | null;
      }
    | { ok: false; error: string } {
    const payload = verifyToken<{ roomCode: string; playerId: string; sessionId: string }>(
      sessionToken
    );
    if (!payload || payload.roomCode !== roomCode.toUpperCase()) {
      return { ok: false, error: 'Invalid or expired session token.' };
    }
    const internal = this.roomsByCode.get(payload.roomCode);
    if (!internal) {
      return { ok: false, error: 'Room no longer exists.' };
    }
    const mappedPlayerId = internal.sessionToPlayer.get(payload.sessionId);
    const player = internal.state.players.find((p) => p.id === payload.playerId);
    if (!player) {
      return { ok: false, error: 'Player was removed from the room.' };
    }
    if (mappedPlayerId && mappedPlayerId !== payload.playerId) {
      return { ok: false, error: 'Session does not match a player in this room.' };
    }
    if (!mappedPlayerId) {
      // Re-register session mapping after DB hydration on server restart
      internal.sessionToPlayer.set(payload.sessionId, player.id);
    }

    player.presence = internal.state.status === 'playing' ? 'playing' : 'online';
    internal.playerSockets.set(player.id, socketId);
    this.socketToRoom.set(socketId, { code: internal.state.code, playerId: player.id });

    return {
      ok: true,
      room: internal,
      playerId: player.id,
      gameState: internal.engine ? internal.engine.getPublicState(player.id) : null,
    };
  }

  getBySocket(socketId: string): { internal: InternalRoom; playerId: string } | null {
    const ref = this.socketToRoom.get(socketId);
    if (!ref) return null;
    const internal = this.roomsByCode.get(ref.code);
    if (!internal) return null;
    return { internal, playerId: ref.playerId };
  }

  getByCode(code: string): InternalRoom | undefined {
    return this.roomsByCode.get(code.toUpperCase());
  }

  markDisconnected(socketId: string): { internal: InternalRoom; playerId: string } | null {
    const ref = this.socketToRoom.get(socketId);
    if (!ref) return null;
    this.socketToRoom.delete(socketId);
    const internal = this.roomsByCode.get(ref.code);
    if (!internal) return null;
    const player = internal.state.players.find((p) => p.id === ref.playerId);
    if (player) {
      player.presence = 'disconnected';
    }
    return { internal, playerId: ref.playerId };
  }

  removePlayer(code: string, playerId: string): { internal: InternalRoom; deletedRoom: boolean } | null {
    const internal = this.roomsByCode.get(code.toUpperCase());
    if (!internal) return null;

    const sockId = internal.playerSockets.get(playerId);
    if (sockId) {
      this.socketToRoom.delete(sockId);
      internal.playerSockets.delete(playerId);
    }

    internal.state.players = internal.state.players.filter((p) => p.id !== playerId);

    if (internal.state.players.length === 0) {
      internal.engine?.cleanup?.();
      this.roomsByCode.delete(internal.state.code);
      if (prisma) {
        prisma.room
          .delete({ where: { code: internal.state.code } })
          .catch(() => {});
      }
      return { internal, deletedRoom: true };
    }

    if (prisma) {
      prisma.roomMember
        .deleteMany({ where: { roomId: internal.state.id, playerId } })
        .catch(() => {});
    }

    if (internal.state.hostId === playerId) {
      const nextHost =
        internal.state.players.find((p) => p.presence !== 'disconnected') ??
        internal.state.players[0];
      if (nextHost) {
        nextHost.isHost = true;
        internal.state.hostId = nextHost.id;
      }
    }

    return { internal, deletedRoom: false };
  }

  listPublicRooms(): Array<{
    code: string;
    name: string;
    selectedGame: GameId;
    playerCount: number;
    maxPlayers: number;
    status: RoomState['status'];
    hasPassword: boolean;
  }> {
    const list: Array<{
      code: string;
      name: string;
      selectedGame: GameId;
      playerCount: number;
      maxPlayers: number;
      status: RoomState['status'];
      hasPassword: boolean;
    }> = [];
    for (const internal of this.roomsByCode.values()) {
      if (internal.state.settings.visibility === 'public' && !internal.state.settings.isLocked) {
        list.push({
          code: internal.state.code,
          name: internal.state.name,
          selectedGame: internal.state.selectedGame,
          playerCount: internal.state.players.length,
          maxPlayers: internal.state.settings.maxPlayers,
          status: internal.state.status,
          hasPassword: internal.state.settings.hasPassword,
        });
      }
    }
    return list;
  }

  buildGameContext(
    internal: InternalRoom,
    emitters: {
      sendPrivateToPlayer: (socketId: string, event: string, payload: unknown) => void;
      broadcastToRoom: (code: string, event: string, payload: unknown) => void;
    }
  ): GameRuntimeContext {
    return {
      roomId: internal.state.id,
      roomCode: internal.state.code,
      settings: internal.state.settings,
      players: internal.state.players,
      awardScore: (playerId, delta) => {
        const p = internal.state.players.find((pl) => pl.id === playerId);
        if (p) {
          p.score += delta;
          emitters.broadcastToRoom(internal.state.code, 'room:updated', internal.state);
        }
      },
      sendPrivateToPlayer: (playerId, event, payload) => {
        const sid = internal.playerSockets.get(playerId);
        if (sid) {
          emitters.sendPrivateToPlayer(sid, event, payload);
        }
      },
      broadcastState: (state) => {
        emitters.broadcastToRoom(internal.state.code, 'game:updated', state);
      },
      finishGame: (summary) => {
        internal.state.status = 'results';
        internal.lastResults = summary;
        emitters.broadcastToRoom(internal.state.code, 'room:updated', internal.state);
        emitters.broadcastToRoom(internal.state.code, 'game:results', summary);
      },
    };
  }
}
