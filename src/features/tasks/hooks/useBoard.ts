'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useBoard(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.board(projectId as string),
    queryFn: () => tasksApi.getBoard(projectId as string),
    enabled: !!projectId,
  });
}
