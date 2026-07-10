'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { ApiError } from '@/lib/api/client';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import type {
  DeleteMessageInput,
  EditMessageInput,
  Message,
} from '@/features/chat/types';
import {
  mergeEditMetadata,
  patchMessageInCache,
  type MessagesCache,
} from './mutation-helpers';

type EditContext = { previous: MessagesCache | undefined };

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation<Message, Error, EditMessageInput, EditContext>({
    mutationFn: (vars) =>
      chatApi.editMessage(vars.conversationId, vars.messageId, vars.plaintext, vars.metadata),

    onMutate: (vars): EditContext => {
      const now = new Date().toISOString();
      const previous = patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
        ...m,
        plaintext: vars.plaintext,
        contentPreview: vars.plaintext,
        // Gộp metadata mới (richText) — bỏ richText cũ nếu lần sửa này không còn định dạng.
        metadata: mergeEditMetadata(m.metadata, vars.metadata),
        isEdited: true,
        editedAt: now,
      }));
      return { previous };
    },

    onSuccess: (serverMsg, vars) => {
      // Đồng bộ lại theo bản chuẩn từ BE (nếu trả Message).
      if (serverMsg && typeof serverMsg === 'object' && 'id' in serverMsg) {
        patchMessageInCache(qc, vars.conversationId, vars.messageId, () => serverMsg);
      }
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },

    onError: (err, vars, ctx) => {
      // Rollback về nội dung cũ (đồng hồ FE/BE lệch hoặc race) — xem doc 15.
      if (ctx?.previous) {
        qc.setQueryData(chatKeys.messages(vars.conversationId), ctx.previous);
      }
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'MESSAGE_EDIT_WINDOW_EXPIRED') {
        toast.error('Đã quá 5 phút — không thể sửa tin này nữa');
      } else if (code === 'MESSAGE_ALREADY_DELETED') {
        // Tin đã bị gỡ ở phía khác → đồng bộ trạng thái thu hồi.
        patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
          ...m,
          isDeleted: true,
          deletedFor: 'EVERYONE',
          plaintext: null,
          contentPreview: null,
          attachments: [],
        }));
        toast.error('Tin nhắn đã bị thu hồi');
      } else {
        toast.error(err.message || 'Sửa tin nhắn thất bại');
      }
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation<Message | void, Error, DeleteMessageInput, EditContext>({
    mutationFn: (vars) => chatApi.deleteMessage(vars.conversationId, vars.messageId),

    onMutate: (vars): EditContext => {
      const previous = patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
        ...m,
        isDeleted: true,
        deletedFor: 'EVERYONE',
        plaintext: null,
        contentPreview: null,
        attachments: [],
      }));
      return { previous };
    },

    onSuccess: (serverMsg, vars) => {
      if (serverMsg && typeof serverMsg === 'object' && 'id' in serverMsg) {
        patchMessageInCache(qc, vars.conversationId, vars.messageId, () => serverMsg);
      }
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },

    onError: (err, vars, ctx) => {
      // Gỡ idempotent ở BE → nếu đã gỡ (409) thì coi như thành công, giữ tombstone.
      if (err instanceof ApiError && err.code === 'MESSAGE_ALREADY_DELETED') return;
      if (ctx?.previous) {
        qc.setQueryData(chatKeys.messages(vars.conversationId), ctx.previous);
      }
      toast.error(err.message || 'Gỡ tin nhắn thất bại');
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { conversationId: string; messageId: string }) =>
      chatApi.markRead(vars.conversationId, vars.messageId),
    onMutate: async (vars) => {
      // Cancel refetch đang bay để không override optimistic (pattern TanStack Query).
      await qc.cancelQueries({ queryKey: chatKeys.conversationLists() });
      await qc.cancelQueries({ queryKey: chatKeys.conversationDetail(vars.conversationId) });
      // Xoá badge ngay lập tức ở cả list lẫn detail.
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) => (c.id === vars.conversationId ? { ...c, unreadCount: 0 } : c))
            : prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation | undefined>(
        chatKeys.conversationDetail(vars.conversationId),
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    },
    onSettled: (_data, _err, vars) => {
      // API trả về (success hoặc error) → ghi đè lại unreadCount: 0 vào cache để chắc chắn.
      // KHÔNG refetch conversationLists sau đó: badge unread đã được set 0 trực tiếp; refetch
      // (server có thể chưa commit read) sẽ kéo về số cũ → "về 0 rồi nhảy lại số cũ".
      // Reconcile để sau qua refetchOnWindowFocus / reconnect (lúc đó read đã commit).
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) => (c.id === vars.conversationId ? { ...c, unreadCount: 0 } : c))
            : prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation | undefined>(
        chatKeys.conversationDetail(vars.conversationId),
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    },
  });
}
