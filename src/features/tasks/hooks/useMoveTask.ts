'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; columnId: string; position: number }) =>
      tasksApi.moveTask(input.taskId, { columnId: input.columnId, position: input.position }),
    onSettled: (_d, _e, vars) => {
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, vars.taskId, 'detail'] });
    },
  });
}
