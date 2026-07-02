'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useUpdateComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      tasksApi.updateComment(projectId, taskId, commentId, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'comments'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
