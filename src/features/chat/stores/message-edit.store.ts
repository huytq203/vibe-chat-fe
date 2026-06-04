'use client';

import { create } from 'zustand';

export type EditingMessage = {
  conversationId: string;
  messageId: string;
  /** Nội dung text gốc, nạp sẵn vào ô nhập khi vào chế độ sửa. */
  text: string;
};

type MessageEditState = {
  editing: EditingMessage | null;
  startEdit: (msg: EditingMessage) => void;
  cancelEdit: () => void;
};

/**
 * Trạng thái "đang sửa tin nhắn" — chia sẻ giữa MessageBubble (nơi bấm Sửa)
 * và MessageInput (nơi hiển thị thanh sửa + nạp nội dung). Tránh prop drilling
 * qua MessageList.
 */
export const useMessageEditStore = create<MessageEditState>((set) => ({
  editing: null,
  startEdit: (msg) => set({ editing: msg }),
  cancelEdit: () => set({ editing: null }),
}));
