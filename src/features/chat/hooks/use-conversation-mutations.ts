'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi, type UpdateConversationInput } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import type { Conversation, GroupSettings } from '@/features/chat/types';
import { useSelectedConversation } from './useSelectedConversation';

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, scope }: { conversationId: string; scope?: 'ME' | 'BOTH' }) =>
      chatApi.deleteConversation(conversationId, scope),
    onSuccess: (_res, { conversationId }) => {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã xoá cuộc trò chuyện');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; memberIds: string[] }) =>
      chatApi.createGroup(input),
    onSuccess: () => {
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
  });
}

/** Đặt/đổi biệt danh per-conversation cho 1 thành viên. BE trả Conversation đã cập nhật. */
export function useSetNickname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
      nickname,
    }: {
      conversationId: string;
      userId: string;
      nickname: string | null;
    }) => chatApi.setNickname(conversationId, userId, nickname),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e: Error) => toast.error(e.message || 'Đổi biệt danh thất bại'),
  });
}

/** Ghim / bỏ ghim hội thoại. Optimistic: set isPinned ngay để conv nổi lên đầu. */
export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; pinned: boolean },
    { previousLists: [readonly unknown[], unknown][] }
  >({
    mutationFn: ({ conversationId, pinned }) => chatApi.setPin(conversationId, pinned),

    onMutate: ({ conversationId, pinned }) => {
      const nowMaybe = new Date().toISOString();
      const previousLists = qc.getQueriesData<Conversation[]>({
        queryKey: chatKeys.conversationLists(),
      });
      qc.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) =>
                c.id === conversationId
                  ? { ...c, isPinned: pinned, pinnedAt: pinned ? nowMaybe : null }
                  : c,
              )
            : prev,
      );
      qc.setQueryData<Conversation | undefined>(
        chatKeys.conversationDetail(conversationId),
        (prev) => (prev ? { ...prev, isPinned: pinned, pinnedAt: pinned ? nowMaybe : null } : prev),
      );
      return { previousLists };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Cập nhật ghim thất bại');
    },

    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
  });
}

/** Mute / unmute thông báo (per-user). Optimistic set isMuted ngay; reconcile bằng response normalize. */
export function useMuteConversation() {
  const qc = useQueryClient();
  type Conv = Conversation;
  return useMutation<
    Conv,
    Error,
    { conversationId: string; isMuted: boolean; mutedUntil?: string | null },
    { previousLists: [readonly unknown[], unknown][] }
  >({
    mutationFn: ({ conversationId, isMuted, mutedUntil }) =>
      chatApi.setMute(conversationId, { isMuted, mutedUntil }),

    onMutate: ({ conversationId, isMuted, mutedUntil }) => {
      const nextUntil = isMuted ? mutedUntil ?? null : null;
      const patch = (c: Conv): Conv =>
        c.id === conversationId ? { ...c, isMuted, mutedUntil: nextUntil } : c;
      const previousLists = qc.getQueriesData<Conv[]>({ queryKey: chatKeys.conversationLists() });
      qc.setQueriesData<Conv[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => (prev ? prev.map(patch) : prev),
      );
      qc.setQueryData<Conv | undefined>(
        chatKeys.conversationDetail(conversationId),
        (prev) => (prev ? { ...prev, isMuted, mutedUntil: nextUntil } : prev),
      );
      return { previousLists };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Cập nhật thông báo thất bại');
    },

    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      qc.setQueriesData<Conv[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => (prev ? prev.map((c) => (c.id === conversationId ? conv : c)) : prev),
      );
    },
  });
}

// ─── Cài đặt nhóm (xem 28-group-settings.md) ─────────────────────────────────

/** Đổi tên/mô tả/công khai nhóm. BE trả Conversation đầy đủ đã cập nhật. */
export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; input: UpdateConversationInput }
  >({
    mutationFn: ({ conversationId, input }) =>
      chatApi.updateConversation(conversationId, input),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      // Patch ngay name/description/avatar vào mọi cache list để item đổi tức thì,
      // không phải chờ refetch (debounce) hay F5.
      qc.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev?.map((c) =>
            c.id === conversationId
              ? { ...c, name: conv.name, description: conv.description, avatarUrl: conv.avatarUrl }
              : c,
          ),
      );
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã cập nhật thông tin nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật nhóm thất bại')),
  });
}

/** Cập nhật quyền hạn nhóm (joinByLink, whoCanSend, …). BE trả Conversation đầy đủ. */
export function useUpdateGroupSettings() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; settings: Partial<GroupSettings> }
  >({
    mutationFn: ({ conversationId, settings }) =>
      chatApi.updateSettings(conversationId, settings),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật quyền nhóm thất bại')),
  });
}

/** Tạo (hoặc mở) hội thoại DIRECT với 1 user rồi chuyển sang hội thoại đó. */
export function useOpenDirectConversation() {
  const qc = useQueryClient();
  const { setSelected } = useSelectedConversation();
  return useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
    },
    onError: (e: Error) => toast.error(e.message || 'Không mở được cuộc trò chuyện'),
  });
}

export function useUpdateBackground() {
  const qc = useQueryClient();
  return useMutation<
    { background: string | null },
    Error,
    { conversationId: string; background: string | null },
    { prev: Conversation | undefined }
  >({
    mutationFn: ({ conversationId, background }) =>
      chatApi.updateBackground(conversationId, background),
    onMutate: async ({ conversationId, background }) => {
      await qc.cancelQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      const prev = qc.getQueryData<Conversation>(chatKeys.conversationDetail(conversationId));
      qc.setQueryData<Conversation>(chatKeys.conversationDetail(conversationId), (old) =>
        old ? { ...old, background } : old,
      );
      return { prev };
    },
    onError: (_e, { conversationId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(chatKeys.conversationDetail(conversationId), ctx.prev);
      toast.error('Đổi nền thất bại');
    },
    onSuccess: (_data, { conversationId }) => {
      debouncedInvalidate(qc, chatKeys.conversationLists());
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
    },
  });
}
