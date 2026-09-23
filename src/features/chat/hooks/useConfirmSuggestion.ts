'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import type { Member } from '@/features/tasks/types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useConfirmCreateTask(projectId: string) {
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      dueDate?: string;
      columnId: string;
      idempotencyKey: string;
    }) => {
      const task = await tasksApi.createTask(
        projectId,
        {
          title: input.title,
          columnId: input.columnId,
          ...(input.description?.trim() ? { description: input.description.trim() } : {}),
          ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        },
        input.idempotencyKey,
      );
      return task;
    },
    onSuccess: () => toast.success('Đã tạo task'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo task')),
  });
}

export function useConfirmUpdateExistingTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dueDate: string | null; version: number; assignee?: Member }) => {
      const task = await tasksApi.updateTask(taskId, { dueDate: input.dueDate, version: input.version });
      if (input.assignee) {
        await tasksApi.addAssignee(projectId, taskId, {
          userId: input.assignee.userId,
          displayName: input.assignee.displayName,
          avatarUrl: input.assignee.avatarUrl,
        });
      }
      return task;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật task');
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId, 'board'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'assignees'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error && 'status' in error && error.status === 409
        ? 'Task vừa được người khác cập nhật, hãy tải lại'
        : errorMessage(error, 'Không thể cập nhật task'));
    },
  });
}
