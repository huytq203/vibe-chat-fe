'use client';

import { create } from 'zustand';
import type { MessageType } from '@/features/chat/types';

export type ReplyingMessage = {
  conversationId: string;
  messageId: string;
  /** Tên người gửi tin gốc — "Bạn" nếu là tin của chính mình. */
  senderName: string;
  /** Preview ngắn của tin gốc, nạp sẵn vào banner soạn tin. */
  snippet: string;
  type: MessageType;
};

type MessageReplyState = {
  replying: ReplyingMessage | null;
  startReply: (msg: ReplyingMessage) => void;
  cancelReply: () => void;
};

/**
 * Trạng thái "đang trả lời tin nhắn" — chia sẻ giữa MessageActions (nơi bấm Trả lời)
 * và MessageInput (nơi hiển thị banner trích dẫn). Tránh prop drilling qua MessageList.
 * Pattern song song với message-edit.store.ts; reply & edit loại trừ lẫn nhau.
 */
export const useMessageReplyStore = create<MessageReplyState>((set) => ({
  replying: null,
  startReply: (msg) => set({ replying: msg }),
  cancelReply: () => set({ replying: null }),
}));
