'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { authKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth/stores/auth.store';

export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.fetchMe(),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}
