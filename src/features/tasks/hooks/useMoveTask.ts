'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { applyTaskMoved, applyTaskUpdated } from '../lib/board-cache';
import { markLocal } from '../lib/local-mutations';
import type { Board, TaskDetail } from '../types';

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; columnId: string; position: number }) => {
      markLocal(input.taskId, 'task:moved');
      const board = qc.getQueryData<Board>(taskKeys.board(projectId));
      const task = board?.columns.flatMap((column) => column.tasks).find((item) => item.id === input.taskId);
      return tasksApi.moveTask(input.taskId, {
        columnId: input.columnId,
        position: input.position,
        version: task?.version,
      });
    },
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
    // Response server là nguồn chuẩn cho column/position/version.
    onSuccess: (updated, vars) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) => {
        if (!board) return board;
        const moved = applyTaskMoved(board, {
          taskId: updated.id,
          columnId: updated.columnId,
          position: updated.position,
        }) ?? board;
        return applyTaskUpdated(moved, {
          taskId: updated.id,
          changes: {
            title: updated.title,
            priority: updated.priority,
            dueDate: updated.dueDate,
            isPinned: updated.isPinned,
            completedAt: updated.completedAt,
            reviewRequestedAt: updated.reviewRequestedAt,
            status: updated.status,
          },
        }) ?? moved;
      });
      qc.setQueryData<TaskDetail>(
        ['tasks', projectId, vars.taskId, 'detail'],
        (detail) => detail
          ? {
              ...detail,
              version: updated.version ?? detail.version,
              columnId: updated.columnId,
              title: updated.title,
              position: updated.position,
              isPinned: updated.isPinned,
              priority: updated.priority,
              gem: updated.gem ?? detail.gem,
              gemSource: updated.gemSource ?? detail.gemSource,
              dueDate: updated.dueDate,
              completedAt: updated.completedAt,
              reviewRequestedAt: updated.reviewRequestedAt,
              status: updated.status,
            }
          : detail,
      );
    },
  });
}
