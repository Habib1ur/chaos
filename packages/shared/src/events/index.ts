import type { GameId, ReactionEmoji } from '../constants/games';
import type {
  ActiveGameState,
  ChatMessage,
  GameResultSummary,
  KingsPrivateState,
  PlayerInfo,
  ReactionPayload,
  RoomSettings,
  RoomState,
} from '../types';

export interface AckResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: unknown,
    cb: (res: AckResponse<{ room: RoomState; playerId: string; sessionToken: string }>) => void
  ) => void;
  'room:join': (
    payload: unknown,
    cb: (res: AckResponse<{ room: RoomState; playerId: string; sessionToken: string }>) => void
  ) => void;
  'room:leave': (cb?: (res: AckResponse) => void) => void;
  'room:ready': (payload: { isReady: boolean }, cb?: (res: AckResponse) => void) => void;
  'room:profile:update': (
    payload: { nickname?: string; avatarId?: string },
    cb?: (res: AckResponse) => void
  ) => void;
  'room:settings:update': (payload: unknown, cb?: (res: AckResponse) => void) => void;
  'room:host:transfer': (payload: { targetPlayerId: string }, cb?: (res: AckResponse) => void) => void;
  'room:kick': (payload: { targetPlayerId: string }, cb?: (res: AckResponse) => void) => void;
  'player:reconnect': (
    payload: { roomCode: string; sessionToken: string },
    cb: (
      res: AckResponse<{
        room: RoomState;
        playerId: string;
        gameState: ActiveGameState | null;
        kingsPrivate?: KingsPrivateState | null;
      }>
    ) => void
  ) => void;
  'game:select': (payload: { gameId: GameId }, cb?: (res: AckResponse) => void) => void;
  'game:start': (cb?: (res: AckResponse) => void) => void;
  'game:end': (cb?: (res: AckResponse) => void) => void;
  'game:return-lobby': (cb?: (res: AckResponse) => void) => void;
  'game:action': (payload: { action: string; data?: unknown }, cb?: (res: AckResponse) => void) => void;
  'game:vote': (payload: unknown, cb?: (res: AckResponse) => void) => void;
  'game:submit': (payload: unknown, cb?: (res: AckResponse) => void) => void;
  'chat:send': (payload: { content: string }, cb?: (res: AckResponse) => void) => void;
  'reaction:send': (payload: { emoji: ReactionEmoji }, cb?: (res: AckResponse) => void) => void;
  'submission:report': (payload: unknown, cb?: (res: AckResponse) => void) => void;
}

export interface ServerToClientEvents {
  'room:updated': (room: RoomState) => void;
  'room:player:joined': (player: PlayerInfo) => void;
  'room:player:left': (payload: { playerId: string; nickname: string }) => void;
  'room:kicked': (payload: { reason: string }) => void;
  'room:error': (payload: { message: string }) => void;
  'game:started': (state: ActiveGameState) => void;
  'game:updated': (state: ActiveGameState) => void;
  'game:kings:private': (state: KingsPrivateState) => void;
  'game:results': (summary: GameResultSummary) => void;
  'chat:message': (message: ChatMessage) => void;
  'reaction:received': (reaction: ReactionPayload) => void;
}
