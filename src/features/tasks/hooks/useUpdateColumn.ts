'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useUpdateColumn(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      columnId,
      ...input
    }: {
      columnId: string;
      name?: string;
      color?: string;
      position?: number;
    }) => tasksApi.updateColumn(columnId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  });
}
