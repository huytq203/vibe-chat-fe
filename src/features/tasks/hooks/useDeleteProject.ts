'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

/** Xoá project — sau khi thành công UI tự điều hướng rời khỏi board. */
export function useDeleteProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.deleteProject(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.projects() }),
  });
}
