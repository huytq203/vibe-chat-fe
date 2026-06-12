'use client';

import { create } from 'zustand';

/**
 * Lỗi gửi tin nhắn theo conversation — hiển thị như "tin nhắn hệ thống" ở cuối
 * MessageList (không phải bubble). Set/clear từ useSendMessage; clear khi user
 * thử gửi lại (onMutate).
 */
type SendErrorState = {
  byConv: Record<string, string | undefined>;
  setError: (conversationId: string, message: string) => void;
  clear: (conversationId: string) => void;
};

export const useSendErrorStore = create<SendErrorState>((set) => ({
  byConv: {},
  setError: (conversationId, message) =>
    set((s) => ({ byConv: { ...s.byConv, [conversationId]: message } })),
  clear: (conversationId) =>
    set((s) => {
      if (!s.byConv[conversationId]) return s;
      const next = { ...s.byConv };
      delete next[conversationId];
      return { byConv: next };
    }),
}));
