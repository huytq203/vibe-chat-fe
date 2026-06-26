'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useProjects() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: taskKeys.projects(),
    queryFn: () => tasksApi.listProjects(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
