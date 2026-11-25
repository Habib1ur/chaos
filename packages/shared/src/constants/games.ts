export const GAME_IDS = [
  'truth-dare',
  'kings-game',
  'who-said-that',
  'most-likely-to',
  'never-have-i-ever',
  'would-you-rather',
  'hot-takes',
  'two-truths-lie',
  'quick-quiz',
  'random-wheel',
  'custom-polls',
] as const;

export type GameId = (typeof GAME_IDS)[number];

export const CONTENT_INTENSITIES = ['chill', 'medium', 'spicy', 'custom'] as const;
export type ContentIntensity = (typeof CONTENT_INTENSITIES)[number];

export const CONTENT_CATEGORIES = [
  'funny',
  'embarrassing',
  'friendship',
  'university',
  'relationships',
  'creative',
  'lighthearted',
  'deep',
  'random',
  'custom',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export const GAME_CATEGORIES = [
  'featured',
  'truth-dare',
  'anonymous',
  'party',
  'voting',
  'social',
  'quick',
  'custom',
] as const;
export type GameCatalogCategory = (typeof GAME_CATEGORIES)[number];

export const REACTION_EMOJIS = ['😂', '❤️', '😭', '🔥', '👀', '💀', '👏', '🤯'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const AVATAR_PRESETS = [
  { id: 'fox', label: 'Chaos Fox', emoji: '🦊', bg: '#3478F6' },
  { id: 'crown', label: 'Royal Crown', emoji: '👑', bg: '#16A36A' },
  { id: 'ghost', label: 'Mystery Ghost', emoji: '👻', bg: '#132B4F' },
  { id: 'alien', label: 'Cosmic Alien', emoji: '👾', bg: '#087F5B' },
  { id: 'lightning', label: 'Volt', emoji: '⚡', bg: '#2455C5' },
  { id: 'fire', label: 'Blaze', emoji: '🔥', bg: '#E65C68' },
  { id: 'unicorn', label: 'Mythic', emoji: '🦄', bg: '#16B8A6' },
  { id: 'cat', label: 'Smirk Cat', emoji: '😼', bg: '#5BB7F5' },
  { id: 'robot', label: 'Bot', emoji: '🤖', bg: '#10B981' },
  { id: 'devil', label: 'Mischief', emoji: '😈', bg: '#37C6D0' },
  { id: 'star', label: 'Superstar', emoji: '🌟', bg: '#F2A93B' },
  { id: 'masks', label: 'Theater', emoji: '🎭', bg: '#1E3046' },
] as const;

export interface GameCatalogItem {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  categories: GameCatalogCategory[];
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: string;
  featured: boolean;
  signature?: boolean;
  badge?: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'truth-dare',
    name: 'Classic Truth or Dare',
    tagline: 'Confess or commit. No backing down.',
    description:
      'Take turns choosing Truth or Dare from the CHAOS bank or player-submitted prompts. Complete challenges, earn points, or use your skips wisely.',
    categories: ['featured', 'truth-dare', 'party', 'social'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '10–30 min',
    featured: true,
    signature: true,
    badge: 'Core',
  },
  {
    id: 'kings-game',
    name: "King's Truth or Dare",
    tagline: 'One crown. Secret orders. Total suspense.',
    description:
      'Every player gets a secret number. The server crowns one random King who writes hidden Truths or Dares for each number before the dramatic reveal.',
    categories: ['featured', 'truth-dare', 'party', 'social'],
    minPlayers: 3,
    maxPlayers: 16,
    estimatedMinutes: '15–35 min',
    featured: true,
    signature: true,
    badge: 'Signature',
  },
  {
    id: 'who-said-that',
    name: 'Who Said That?',
    tagline: 'Anonymous confessions. Detective chaos.',
    description:
      'Everyone submits anonymous confessions, hot opinions, or compliments. Statements are shuffled and the room votes on who actually wrote each one.',
    categories: ['featured', 'anonymous', 'social', 'voting'],
    minPlayers: 3,
    maxPlayers: 16,
    estimatedMinutes: '10–25 min',
    featured: true,
    signature: true,
    badge: 'Anonymous',
  },
  {
    id: 'most-likely-to',
    name: 'Most Likely To',
    tagline: 'Point fingers. Reveal the consensus.',
    description:
      'Vote on which friend in the room is most likely to pull off something outrageous. Live vote distributions and crown winners every round.',
    categories: ['featured', 'party', 'voting', 'quick'],
    minPlayers: 3,
    maxPlayers: 16,
    estimatedMinutes: '8–20 min',
    featured: true,
  },
  {
    id: 'never-have-i-ever',
    name: 'Never Have I Ever',
    tagline: 'Own up or stay innocent.',
    description:
      'React to wild and relatable statements with "I have" or "I have never" and see who in your friend group has lived the wildest life.',
    categories: ['party', 'social', 'quick'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '8–20 min',
    featured: false,
  },
  {
    id: 'would-you-rather',
    name: 'Would You Rather',
    tagline: 'Two impossible choices. Instant debate.',
    description:
      'Pick between two dilemmas and watch live percentages split the room in real time.',
    categories: ['party', 'voting', 'quick'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '5–15 min',
    featured: false,
  },
  {
    id: 'hot-takes',
    name: 'Hot Takes',
    tagline: 'Unpopular opinions on trial.',
    description:
      'Debate spicy everyday opinions. Vote Agree, Disagree, or Unsure and defend your stance in room chat.',
    categories: ['party', 'voting', 'social'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '10–20 min',
    featured: false,
  },
  {
    id: 'two-truths-lie',
    name: 'Two Truths & A Lie',
    tagline: 'Spot the bluff before time runs out.',
    description:
      'One player shares three statements—two true, one fake. Everyone else tries to detect the lie to earn detective points.',
    categories: ['social', 'voting', 'party'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '10–25 min',
    featured: false,
  },
  {
    id: 'quick-quiz',
    name: 'Quick Quiz',
    tagline: 'Fast trivia. Live leaderboard.',
    description:
      'Race against the clock on multiple-choice trivia packs. Speed and accuracy both count toward the crown.',
    categories: ['party', 'quick'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '5–15 min',
    featured: false,
  },
  {
    id: 'random-wheel',
    name: 'Random Wheel',
    tagline: 'Spin for fate. Server-verified.',
    description:
      'Build a custom wheel of names, dares, or outcomes. The server picks the winning slice and syncs the spin across every screen.',
    categories: ['quick', 'custom', 'party'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '5–15 min',
    featured: false,
  },
  {
    id: 'custom-polls',
    name: 'Custom Polls',
    tagline: 'Instant room polls, your rules.',
    description:
      'Create quick custom polls with multiple choices, anonymous or named voting, and live results.',
    categories: ['voting', 'custom', 'quick'],
    minPlayers: 2,
    maxPlayers: 16,
    estimatedMinutes: '5–15 min',
    featured: false,
  },
];

export const ROOM_DEFAULTS = {
  maxPlayers: 12,
  minPlayers: 2,
  rounds: 8,
  roundTimerSeconds: 45,
  maxSkips: 2,
};
