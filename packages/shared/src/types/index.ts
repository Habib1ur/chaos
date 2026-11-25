import type {
  ContentCategory,
  ContentIntensity,
  GameId,
  ReactionEmoji,
} from '../constants/games';

export type RoomVisibility = 'public' | 'private' | 'invite-only';

export type PlayerPresence = 'online' | 'disconnected' | 'reconnecting' | 'playing' | 'waiting';

export interface PlayerInfo {
  id: string;
  sessionId: string;
  userId?: string | null;
  nickname: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  isGuest: boolean;
  presence: PlayerPresence;
  score: number;
  joinedAt: number;
}

export interface RoomSettings {
  visibility: RoomVisibility;
  maxPlayers: number;
  hasPassword: boolean;
  isLocked: boolean;
  allowGuestJoin: boolean;
  allowPlayerSubmissions: boolean;
  requireHostApproval: boolean;
  allowAnonymousSubmissions: boolean;
  allowSkip: boolean;
  maxSkips: number;
  enableScoring: boolean;
  enableChat: boolean;
  intensity: ContentIntensity;
  categories: ContentCategory[];
  rounds: number;
  timerSeconds: number;
  anonymousMessagesPerPlayer: number;
  anonymousMode: 'classic' | 'spotlight';
  revealAuthorsInAnonymous: boolean;
  noConsecutiveKing: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: 'user' | 'system';
  timestamp: number;
}

export interface ReactionPayload {
  id: string;
  playerId: string;
  playerName: string;
  emoji: ReactionEmoji;
  timestamp: number;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  hostId: string;
  selectedGame: GameId;
  status: 'lobby' | 'playing' | 'results';
  settings: RoomSettings;
  players: PlayerInfo[];
  createdAt: number;
}

// ============================================================================
// Game-Specific Public & Private State Types
// ============================================================================

export type TruthDarePhase =
  | 'selecting-player'
  | 'choosing-type'
  | 'performing'
  | 'round-summary'
  | 'finished';

export interface TruthDarePromptItem {
  id: string;
  type: 'truth' | 'dare';
  text: string;
  category: ContentCategory;
  intensity: ContentIntensity;
  source: 'builtin' | 'player' | 'host';
  approved: boolean;
}

export interface TruthDareState {
  gameId: 'truth-dare';
  phase: TruthDarePhase;
  round: number;
  totalRounds: number;
  activePlayerId: string | null;
  choice: 'truth' | 'dare' | null;
  currentPrompt: TruthDarePromptItem | null;
  lastOutcome: {
    playerId: string;
    playerName: string;
    choice: 'truth' | 'dare';
    outcome: 'completed' | 'skipped' | 'passed';
    pointsAwarded: number;
  } | null;
  skipsUsed: Record<string, number>;
  pendingSubmissionsCount: number;
  /** Only populated for host when moderation is enabled */
  pendingSubmissions?: TruthDarePromptItem[];
  endsAt: number | null;
}

export type KingsGamePhase =
  | 'coup-dares'
  | 'shuffling'
  | 'king-announced'
  | 'king-assigning'
  | 'revealing'
  | 'king-twist'
  | 'finished';

export type KingsMissionLevel = 'chill' | 'funny' | 'embarrassing' | 'savage';

export interface KingsPublicAssignment {
  index: number;
  targetNumber: number;
  unmasked: boolean;
  targetPlayerId: string | null;
  targetPlayerName: string | null;
  targetPlayerAvatar?: string | null;
  jointTargetNumber?: number | null;
  jointTargetPlayerId?: string | null;
  jointTargetPlayerName?: string | null;
  jointTargetPlayerAvatar?: string | null;
  type: 'truth' | 'dare';
  level: KingsMissionLevel;
  isStarPick?: boolean;
  text: string;
  status: 'pending' | 'completed' | 'creative' | 'skipped' | 'passed';
}

export interface KingsNumberSlot {
  number: number;
  playerId: string;
  /** Omitted for King's draftSlots so the King doesn't know who holds which number */
  playerName?: string;
}

export interface KingsTwistInfo {
  decreedByName: string;
  text: string;
  status: 'pending' | 'completed' | 'skipped';
}

export interface KingsGameState {
  gameId: 'kings-game';
  phase: KingsGamePhase;
  round: number;
  totalRounds: number;
  kingPlayerId: string | null;
  kingPlayerName: string | null;
  coupDaresSubmittedPlayerIds: string[];
  /** Shuffled player numbers (playerName hidden until unmasked during reveal) */
  numberSlots: Array<{ number: number }>;
  totalAssignmentsNeeded: number;
  assignmentsSubmitted: boolean;
  /** Revealed assignments so far (never includes unrevealed secret assignments) */
  revealedAssignments: KingsPublicAssignment[];
  currentRevealIndex: number;
  kingTwist: KingsTwistInfo | null;
  endsAt: number | null;
}

export interface KingsPrivateState {
  myNumber: number;
  isKing: boolean;
  hasSubmittedCoupDare: boolean;
  /** Only sent to the King while assigning (numbers only, no names!) */
  draftSlots?: Array<{ number: number }>;
}

export type WhoSaidThatPhase =
  | 'selecting-spotlight'
  | 'submitting'
  | 'guessing'
  | 'reveal'
  | 'finished';

export interface AnonymousPublicStatement {
  id: string;
  text: string;
  category: ContentCategory;
  /** Only populated in 'reveal' phase if room settings allow author reveal */
  authorId?: string;
  authorName?: string;
}

export interface RoundPointAward {
  points: number;
  multiplier?: number;
  label?: string;
}

export interface WhoSaidThatState {
  gameId: 'who-said-that';
  phase: WhoSaidThatPhase;
  mode: 'classic' | 'spotlight';
  spotlightPlayerId: string | null;
  spotlightPlayerName: string | null;
  messagesPerPlayer: number;
  round: number;
  totalStatements: number;
  submissionsReceivedCount: number;
  submittedPlayerIds: string[];
  currentStatementIndex: number;
  /** NEVER contains authorId during submitting or guessing phases */
  currentStatement: AnonymousPublicStatement | null;
  guessesCount: number;
  guessedPlayerIds: string[];
  voteDistribution: Record<string, number>;
  /** Maps targetPlayerId -> array of voterPlayerIds for live voting balls */
  liveVotes: Record<string, string[]>;
  roundPoints?: Record<string, RoundPointAward>;
  mySubmissionCount: number;
  endsAt: number | null;
}

export type PartyGamePhase = 'prompt' | 'voting' | 'reveal' | 'finished';

export interface PartyOption {
  id: string;
  label: string;
}

export interface PartyGameState {
  gameId: Exclude<GameId, 'truth-dare' | 'kings-game' | 'who-said-that'>;
  phase: PartyGamePhase;
  round: number;
  totalRounds: number;
  promptText: string;
  subText?: string;
  options: PartyOption[];
  votedPlayerIds: string[];
  /** Revealed after voting closes */
  voteCounts: Record<string, number>;
  winnerOptionId?: string | null;
  /** For Two Truths & a Lie or Quiz */
  correctOptionId?: string | null;
  /** For Random Wheel: winning slice index determined by server */
  wheelWinnerIndex?: number | null;
  /** For Two Truths & a Lie: active storyteller */
  storytellerId?: string | null;
  roundPoints?: Record<string, RoundPointAward>;
  endsAt: number | null;
}

export type ActiveGameState =
  | TruthDareState
  | KingsGameState
  | WhoSaidThatState
  | PartyGameState;

export interface GameResultSummary {
  gameId: GameId;
  gameName: string;
  rankings: Array<{
    playerId: string;
    nickname: string;
    avatarId: string;
    score: number;
    rank: number;
    badge?: string;
  }>;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  endedAt: number;
}
