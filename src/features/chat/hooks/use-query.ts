'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

export function useConversations(params: { page?: number; limit?: number } = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.conversationList({ page, limit }),
    queryFn: () => chatApi.listConversations({ page, limit }),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: id ? chatKeys.conversationDetail(id) : ['chat', 'conversation', 'null'],
    queryFn: () => chatApi.getConversation(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: conversationId ? chatKeys.messages(conversationId) : ['chat', 'messages', 'null'],
    queryFn: ({ pageParam }) =>
      chatApi.listMessages(conversationId as string, {
        limit: 30,
        before: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(conversationId),
    staleTime: 10_000,
  });
}

export function usePresence(userIds: string[]) {
  const enabled = userIds.length > 0;
  return useQuery({
    queryKey: chatKeys.presence(userIds),
    queryFn: () => chatApi.getPresenceBulk(userIds),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
