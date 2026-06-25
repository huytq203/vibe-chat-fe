'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { friendsApi } from '@/services/friends.api';
import { blocksApi } from '@/services/blocks.api';
import { usersApi } from '@/services/users.api';
import { blockKeys, friendKeys, userKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

const MIN_QUERY_LENGTH = 2;

export function useUserSearch(query: string, limit = 20) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;
  return useQuery({
    queryKey: userKeys.search(trimmed, limit),
    queryFn: () => usersApi.search({ q: trimmed, limit }),
    enabled,
    staleTime: 15_000,
  });
}

export function useIncomingFriendRequests() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: friendKeys.incoming(),
    queryFn: () => friendsApi.listIncoming({ limit: 50 }),
    enabled: isAuthed,
    // WS 'friend:update' (useFriendRealtime) invalidate key này → không cần poll.
    staleTime: 5 * 60_000,
  });
}

export function useOutgoingFriendRequests() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: friendKeys.outgoing(),
    queryFn: () => friendsApi.listOutgoing({ limit: 50 }),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}

export function useFriends() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () => friendsApi.listFriends({ limit: 50 }),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}

/** Danh sách bạn bè phân trang cursor — lazy load cho modal Tìm kiếm & Kết bạn. */
export function useFriendsInfinite(limit = 20) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: friendKeys.listInfinite(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => friendsApi.listFriends({ limit, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}

export function useBlockedUsers() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: blockKeys.list(),
    queryFn: () => blocksApi.list({ limit: 50 }),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}
