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
    }) => {
      const board = qc.getQueryData<import('../types').Board>(
        taskKeys.board(projectId),
      );
      const column = board?.columns.find((item) => item.id === columnId);
      return tasksApi.updateColumn(columnId, {
        ...input,
        version: column?.version,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  });
}
