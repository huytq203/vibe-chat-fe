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
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.projects() }),
  });
}
