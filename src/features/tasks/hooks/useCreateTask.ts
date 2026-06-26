'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; columnId: string }) =>
      tasksApi.createTask(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  });
}
