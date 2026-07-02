'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { tasksApi } from '../services/tasks.api';

/** Task được gán cho user hiện tại, gộp từ mọi project. */
export function useMyTasks() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['tasks', 'my'],
    queryFn: () => tasksApi.getMyTasks(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
