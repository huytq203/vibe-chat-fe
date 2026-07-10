'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { ApiError } from '@/lib/api/client';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import type { Conversation } from '@/features/chat/types';

export function useLockConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.lockConversation(conversationId, password),
    onSuccess: (conv, { conversationId }) => {
      // Xoá khỏi normal list, thêm vào locked list
      qc.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? prev,
      );
      qc.setQueryData<Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => {
          const list = prev ?? [];
          if (list.some((c) => c.id === conv.id)) return list;
          return [conv, ...list];
        },
      );
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      toast.success('Đã khoá hội thoại');
    },
    onError: (e: Error) => toast.error(e.message || 'Khoá hội thoại thất bại'),
  });
}

export function useRemoveLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.removeLock(conversationId, password),
    onSuccess: (_res, { conversationId }) => {
      // Xoá khỏi locked list, invalidate detail + lists để refetch
      qc.setQueryData<Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? prev,
      );
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã tắt khoá hội thoại');
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu xác nhận');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        // Race: đã unlock ở thiết bị khác — sync cache
        qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      } else {
        toast.error(e.message || 'Tắt khoá thất bại');
      }
    },
  });
}

/**
 * Đổi mật khẩu khoá hội thoại: BẮT BUỘC nhập đúng mật khẩu hiện tại (verify) rồi mới
 * đặt mật khẩu mới. BE PUT /lock không tự kiểm mật khẩu cũ nên FE chặn ở đây.
 */
export function useChangeLockPassword() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; currentPassword: string; newPassword: string }
  >({
    mutationFn: async ({ conversationId, currentPassword, newPassword }) => {
      // verifyLock ném lỗi nếu mật khẩu hiện tại sai → không đổi sang mật khẩu mới.
      await chatApi.verifyLock(conversationId, currentPassword);
      return chatApi.lockConversation(conversationId, newPassword);
    },
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      toast.success('Đã đổi mật khẩu hội thoại');
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Mật khẩu hiện tại không đúng');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      } else {
        toast.error(e.message || 'Đổi mật khẩu thất bại');
      }
    },
  });
}

export function useVerifyLock() {
  const convLockStore = useConvLockStore();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.verifyLock(conversationId, password),
    onSuccess: (_res, { conversationId }) => {
      convLockStore.markUnlocked(conversationId);
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu, thử lại');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        // Race: conv vừa unlock ở thiết bị khác — không cần hiện lỗi
      } else {
        toast.error(e.message || 'Xác thực thất bại');
      }
    },
  });
}
