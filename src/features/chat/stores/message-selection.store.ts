'use client';

import { create } from 'zustand';
import { toast } from 'sonner';

const MAX_SELECTED = 50;

type MessageSelectionState = {
  conversationId: string | null;
  selectedIds: Set<string>;
  enter: (conversationId: string, firstMessageId: string) => void;
  toggle: (messageId: string) => void;
  exit: () => void;
};

/**
 * Chế độ "chọn nhiều tin nhắn" để phân tích hàng loạt — chia sẻ giữa MessageActions/
 * MessageActionDrawer (nơi bật chế độ chọn), MessageBubble (checkbox overlay) và
 * MessageList/MessageSelectionToolbar (đếm số lượng + hành động). Không persist —
 * chọn nhiều là thao tác tạm thời trong 1 phiên xem hội thoại.
 */
export const useMessageSelectionStore = create<MessageSelectionState>((set, get) => ({
  conversationId: null,
  selectedIds: new Set(),
  enter: (conversationId, firstMessageId) =>
    set({ conversationId, selectedIds: new Set([firstMessageId]) }),
  toggle: (messageId) => {
    const { selectedIds } = get();
    const next = new Set(selectedIds);
    if (next.has(messageId)) {
      next.delete(messageId);
    } else {
      if (next.size >= MAX_SELECTED) {
        toast.error(`Chỉ chọn tối đa ${MAX_SELECTED} tin nhắn`);
        return;
      }
      next.add(messageId);
    }
    if (next.size === 0) {
      set({ conversationId: null, selectedIds: next });
      return;
    }
    set({ selectedIds: next });
  },
  exit: () => set({ conversationId: null, selectedIds: new Set() }),
}));
