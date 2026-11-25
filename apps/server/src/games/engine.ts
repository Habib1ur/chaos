import type {
  ActiveGameState,
  GameId,
  GameResultSummary,
  PlayerInfo,
  RoomSettings,
} from '@chaos/shared';

export interface GameRuntimeContext {
  roomId: string;
  roomCode: string;
  settings: RoomSettings;
  players: PlayerInfo[];
  awardScore: (playerId: string, delta: number) => void;
  sendPrivateToPlayer: (playerId: string, event: string, payload: unknown) => void;
  broadcastState: (state: ActiveGameState) => void;
  finishGame: (summary: GameResultSummary) => void;
}

export interface GameEngine<TState extends ActiveGameState = ActiveGameState> {
  readonly gameId: GameId;
  start(ctx: GameRuntimeContext): TState;
  getPublicState(playerId?: string): TState;
  handleAction(
    ctx: GameRuntimeContext,
    playerId: string,
    action: string,
    data?: unknown
  ): { ok: boolean; error?: string };
  handleSubmit?(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string };
  handleVote?(
    ctx: GameRuntimeContext,
    playerId: string,
    payload: unknown
  ): { ok: boolean; error?: string };
  onPlayerReconnect?(ctx: GameRuntimeContext, playerId: string): void;
  cleanup?(): void;
}

export function buildRankings(players: PlayerInfo[], badgeWinner = 'Champion') {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((p, idx) => ({
    playerId: p.id,
    nickname: p.nickname,
    avatarId: p.avatarId,
    score: p.score,
    rank: idx + 1,
    badge: idx === 0 && p.score > 0 ? badgeWinner : undefined,
  }));
}
