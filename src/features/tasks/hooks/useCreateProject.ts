'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      startDate?: string | null;
      endDate?: string | null;
    }) => tasksApi.createProject(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.projects() });
      // Tiến độ dòng project đọc từ stats/overview → phải làm mới theo
      void qc.invalidateQueries({ queryKey: ['tasks', 'overview'] });
    },
  });
}
