'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; columnId: string; position: number }) =>
      tasksApi.moveTask(input.taskId, { columnId: input.columnId, position: input.position }),
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  });
}
