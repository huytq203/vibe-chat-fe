'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { applyTaskMoved } from '../lib/board-cache';
import type { Board } from '../types';

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; columnId: string; position: number }) =>
      tasksApi.moveTask(input.taskId, { columnId: input.columnId, position: input.position }),
    // Optimistic: card nhảy ngay khi thả, không chờ server round-trip
    onMutate: async (vars) => {
      const key = taskKeys.board(projectId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Board>(key);
      if (previous) {
        const next = applyTaskMoved(previous, vars);
        if (next) qc.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(taskKeys.board(projectId), ctx.previous);
    },
    // Reconcile với server (position chuẩn hoá, event của người khác chen giữa)
    onSettled: (_d, _e, vars) => {
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, vars.taskId, 'detail'] });
    },
  });
}
