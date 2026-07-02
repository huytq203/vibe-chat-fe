'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

const PAGE_SIZE = 5;

/**
 * Danh sách project phân trang (lazy load) + search theo tên.
 * Query key nằm dưới prefix `taskKeys.projects()` để dùng chung invalidation
 * với create/update/delete/realtime (React Query khớp prefix).
 */
export function useProjectsInfinite(q: string) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: [...taskKeys.projects(), 'infinite', q] as const,
    queryFn: ({ pageParam }) =>
      tasksApi.listProjectsPaged({ page: pageParam, limit: PAGE_SIZE, q }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
