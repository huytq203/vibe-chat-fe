'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

/** Xoá project — sau khi thành công UI tự điều hướng rời khỏi board. */
export function useDeleteProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.deleteProject(projectId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.projects() });
      toast.success('Đã xoá dự án');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể xoá dự án, vui lòng thử lại',
      ),
  });
}
