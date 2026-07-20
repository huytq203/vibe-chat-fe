'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { tasksApi } from '../services/tasks.api';

/** Feed hoạt động tổng hợp từ mọi project user tham gia (phân trang). */
export function useActivityFeed(page = 1, limit = 20) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['tasks', 'feed', page, limit],
    queryFn: () => tasksApi.getActivityFeed(page, limit),
    enabled: isAuthed,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
