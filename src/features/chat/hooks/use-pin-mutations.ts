'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error-message';

// ─── Ghim tin nhắn (xem 29-pinned-messages.md) ───────────────────────────────

/** Ghim 1 tin. Invalidate danh sách ghim + detail (pinnedCount). */
export function usePinMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.pinMessage(conversationId, messageId),
    onSuccess: (_msg, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      toast.success('Đã ghim tin nhắn');
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : '';
      // Đã ghim ở nơi khác → coi như xong, chỉ đồng bộ danh sách.
      if (code === 'MESSAGE_ALREADY_PINNED') return;
      toast.error(getErrorMessage(e, 'Ghim tin nhắn thất bại'));
    },
  });
}

/** Bỏ ghim 1 tin. */
export function useUnpinMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.unpinMessage(conversationId, messageId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'MESSAGE_NOT_PINNED') return;
      toast.error(getErrorMessage(e, 'Bỏ ghim thất bại'));
    },
  });
}
