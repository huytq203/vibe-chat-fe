'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useCreateColumn(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) =>
      tasksApi.createColumn(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  });
}
