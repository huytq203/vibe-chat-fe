'use client';

import { create } from 'zustand';

type TypingState = {
  byConv: Record<string, string[]>;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearConv: (conversationId: string) => void;
};

export const useTypingStore = create<TypingState>((set) => ({
  byConv: {},
  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = s.byConv[conversationId] ?? [];
      const exists = current.includes(userId);
      if (isTyping && exists) return s;
      if (!isTyping && !exists) return s;
      const next = isTyping ? [...current, userId] : current.filter((u) => u !== userId);
      return { byConv: { ...s.byConv, [conversationId]: next } };
    }),
  clearConv: (conversationId) =>
    set((s) => {
      if (!s.byConv[conversationId]) return s;
      const { [conversationId]: _, ...rest } = s.byConv;
      return { byConv: rest };
    }),
}));
