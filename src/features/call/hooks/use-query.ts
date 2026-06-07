'use client';

import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/services/call.api';
import { callKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

export function useCallHistory(conversationId?: string) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: callKeys.history(conversationId),
    queryFn: () => callApi.listHistory({ conversationId, page: 1, limit: 20 }),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
