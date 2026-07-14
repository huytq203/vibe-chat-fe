'use client';

import { create } from 'zustand';

type DraftCommand = {
  id: number;
  text: string;
};

type MessageDraftCommandState = {
  byConv: Record<string, DraftCommand | undefined>;
  nextId: number;
  setDraftCommand: (conversationId: string, text: string) => void;
  clearDraftCommand: (conversationId: string, id: number) => void;
};

/**
 * Command chip trong message bubble dùng store này để nạp slash command vào
 * composer mà không phải truyền callback xuyên qua ChatPanel/MessageList.
 */
export const useMessageDraftCommandStore = create<MessageDraftCommandState>(
  (set) => ({
    byConv: {},
    nextId: 0,
    setDraftCommand: (conversationId, text) =>
      set((state) => ({
        nextId: state.nextId + 1,
        byConv: {
          ...state.byConv,
          [conversationId]: { id: state.nextId + 1, text },
        },
      })),
    clearDraftCommand: (conversationId, id) =>
      set((state) => {
        if (state.byConv[conversationId]?.id !== id) return state;
        const next = { ...state.byConv };
        delete next[conversationId];
        return { byConv: next };
      }),
  }),
);
