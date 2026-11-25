'use client';

import { create } from 'zustand';
import type {
  ActiveGameState,
  ChatMessage,
  GameResultSummary,
  KingsPrivateState,
  ReactionPayload,
  RoomState,
} from '@chaos/shared';

export interface AuthUser {
  id: string;
  nickname?: string;
  displayName?: string;
  username?: string;
  email?: string;
  avatarId: string;
  isGuest: boolean;
  gamesPlayed?: number;
  gamesWon?: number;
  totalScore?: number;
}

interface ChaosStoreState {
  room: RoomState | null;
  playerId: string | null;
  sessionToken: string | null;
  gameState: ActiveGameState | null;
  kingsPrivate: KingsPrivateState | null;
  results: GameResultSummary | null;
  chatMessages: ChatMessage[];
  reactions: ReactionPayload[];
  soundEnabled: boolean;
  user: AuthUser | null;

  setSession: (payload: {
    room: RoomState;
    playerId: string;
    sessionToken: string;
  }) => void;
  setRoom: (room: RoomState | null) => void;
  setGameState: (state: ActiveGameState | null) => void;
  setKingsPrivate: (priv: KingsPrivateState | null) => void;
  setResults: (results: GameResultSummary | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addReaction: (rx: ReactionPayload) => void;
  toggleSound: () => void;
  setUser: (user: AuthUser | null) => void;
  clearRoom: () => void;
}

export const useChaosStore = create<ChaosStoreState>((set) => ({
  room: null,
  playerId: null,
  sessionToken: null,
  gameState: null,
  kingsPrivate: null,
  results: null,
  chatMessages: [],
  reactions: [],
  soundEnabled: false,
  user: null,

  setSession: ({ room, playerId, sessionToken }) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `chaos_room_${room.code}`,
        JSON.stringify({ playerId, sessionToken })
      );
    }
    set({ room, playerId, sessionToken, results: null });
  },

  setRoom: (room) => set({ room }),

  setGameState: (gameState) => set({ gameState }),

  setKingsPrivate: (kingsPrivate) => set({ kingsPrivate }),

  setResults: (results) => set({ results }),

  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-79), msg],
    })),

  addReaction: (rx) => {
    set((s) => ({
      reactions: [...s.reactions.slice(-14), rx],
    }));
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        set((s) => ({
          reactions: s.reactions.filter((r) => r.id !== rx.id),
        }));
      }, 3500);
    }
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  setUser: (user) => set({ user }),

  clearRoom: () =>
    set({
      room: null,
      playerId: null,
      sessionToken: null,
      gameState: null,
      kingsPrivate: null,
      results: null,
      chatMessages: [],
      reactions: [],
    }),
}));
