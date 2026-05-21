'use client';

import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '@/services/friends.api';
import { usersApi } from '@/services/users.api';
import { friendKeys, userKeys } from '@/services/keys';
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
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useOutgoingFriendRequests() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: friendKeys.outgoing(),
    queryFn: () => friendsApi.listOutgoing({ limit: 50 }),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useFriends() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () => friendsApi.listFriends({ limit: 50 }),
    enabled: isAuthed,
    staleTime: 60_000,
  });
}
