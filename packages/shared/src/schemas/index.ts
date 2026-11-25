import { z } from 'zod';
import {
  CONTENT_CATEGORIES,
  CONTENT_INTENSITIES,
  GAME_IDS,
  REACTION_EMOJIS,
} from '../constants/games';

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Nickname must be at least 2 characters')
  .max(24, 'Nickname must be at most 24 characters')
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Only letters, numbers, spaces, - and _ allowed');

export const avatarIdSchema = z.string().trim().min(1).max(32);

export const createRoomSchema = z.object({
  roomName: z.string().trim().min(2).max(40).default('Chaos Party'),
  nickname: nicknameSchema,
  avatarId: avatarIdSchema.default('fox'),
  selectedGame: z.enum(GAME_IDS).default('truth-dare'),
  visibility: z.enum(['public', 'private', 'invite-only']).default('private'),
  password: z.string().max(32).optional(),
  maxPlayers: z.number().int().min(2).max(16).default(12),
  intensity: z.enum(CONTENT_INTENSITIES).default('medium'),
  categories: z.array(z.enum(CONTENT_CATEGORIES)).min(1).default(['funny', 'lighthearted', 'friendship']),
});

export const joinRoomSchema = z.object({
  code: z.string().trim().toUpperCase().min(4).max(10),
  nickname: nicknameSchema,
  avatarId: avatarIdSchema.default('fox'),
  password: z.string().max(32).optional(),
});

export const updateRoomSettingsSchema = z.object({
  visibility: z.enum(['public', 'private', 'invite-only']).optional(),
  maxPlayers: z.number().int().min(2).max(16).optional(),
  isLocked: z.boolean().optional(),
  allowPlayerSubmissions: z.boolean().optional(),
  requireHostApproval: z.boolean().optional(),
  allowAnonymousSubmissions: z.boolean().optional(),
  allowSkip: z.boolean().optional(),
  maxSkips: z.number().int().min(0).max(10).optional(),
  enableScoring: z.boolean().optional(),
  enableChat: z.boolean().optional(),
  intensity: z.enum(CONTENT_INTENSITIES).optional(),
  categories: z.array(z.enum(CONTENT_CATEGORIES)).min(1).optional(),
  rounds: z.number().int().min(1).max(30).optional(),
  timerSeconds: z.number().int().min(0).max(180).optional(),
  anonymousMessagesPerPlayer: z.number().int().min(1).max(5).optional(),
  anonymousMode: z.enum(['classic', 'spotlight']).optional(),
  revealAuthorsInAnonymous: z.boolean().optional(),
  noConsecutiveKing: z.boolean().optional(),
});

export const truthDareSubmitSchema = z.object({
  type: z.enum(['truth', 'dare']),
  text: z.string().trim().min(5, 'Prompt must be at least 5 characters').max(280),
  category: z.enum(CONTENT_CATEGORIES).default('funny'),
  intensity: z.enum(CONTENT_INTENSITIES).default('medium'),
  anonymous: z.boolean().default(true),
});

export const kingsCoupDareSchema = z.object({
  text: z.string().trim().max(300).default(''),
});

export const kingsAssignmentSchema = z.object({
  assignments: z
    .array(
      z.object({
        targetNumber: z.number().int().min(1).max(99),
        jointTargetNumber: z.number().int().min(1).max(99).nullable().optional(),
        type: z.enum(['truth', 'dare']),
        level: z.enum(['chill', 'funny', 'embarrassing', 'savage']).default('funny'),
        isStarPick: z.boolean().default(false),
        text: z.string().trim().min(4, 'Assignment must be at least 4 characters').max(280),
      })
    )
    .min(1),
});

export const anonymousSubmitSchema = z.object({
  text: z.string().trim().min(4, 'Statement must be at least 4 characters').max(280),
  category: z.enum(CONTENT_CATEGORIES).default('funny'),
});

export const anonymousGuessSchema = z.object({
  targetPlayerId: z.string().min(1),
});

export const partyVoteSchema = z.object({
  optionId: z.string().min(1),
});

export const twoTruthsSubmitSchema = z.object({
  statements: z
    .tuple([
      z.string().trim().min(3).max(200),
      z.string().trim().min(3).max(200),
      z.string().trim().min(3).max(200),
    ]),
  lieIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export const wheelSpinSchema = z.object({
  items: z.array(z.string().trim().min(1).max(80)).min(2).max(12),
});

export const customPollSchema = z.object({
  question: z.string().trim().min(4).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
});

export const chatMessageSchema = z.object({
  content: z.string().trim().min(1).max(400),
});

export const reactionSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
});

export const reportSchema = z.object({
  targetType: z.enum(['submission', 'chat', 'player']),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(300),
});

export const authRegisterSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  displayName: nicknameSchema,
  password: z.string().min(8).max(100),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
