'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  changeRequestsApi,
  commitmentsApi,
} from '@/features/tasks/services/commitments.api';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import type { CreateSourceRefInput } from '@/features/tasks/types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useConfirmCreateCommitment(projectId: string) {
  return useMutation({
    mutationFn: (input: {
      title: string;
      description?: string;
      ownerId?: string;
      promisedAt?: string;
      dueAt?: string;
      scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      sourceRefs?: CreateSourceRefInput[];
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return commitmentsApi.create(projectId, body, idempotencyKey);
    },
    onSuccess: () => toast.success('Đã tạo cam kết'),
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể tạo cam kết')),
  });
}

export function useConfirmCreateChangeRequest(projectId: string) {
  return useMutation({
    mutationFn: (input: {
      title: string;
      impact: string;
      estimateHours?: number;
      cost?: number;
      timelineShiftDays?: number;
      commitmentId?: string;
      sourceRefs?: CreateSourceRefInput[];
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return changeRequestsApi.create(projectId, body, idempotencyKey);
    },
    onSuccess: () => toast.success('Đã tạo yêu cầu thay đổi'),
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể tạo yêu cầu thay đổi')),
  });
}

export function useConfirmCreateTask(projectId: string) {
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      columnId: string;
      commitmentId?: string;
      idempotencyKey: string;
    }) => {
      const task = await tasksApi.createTask(
        projectId,
        { title: input.title, columnId: input.columnId },
        input.idempotencyKey,
      );
      if (input.commitmentId) {
        try {
          await commitmentsApi.linkTask(input.commitmentId, task.id);
        } catch {
          // Task đã tạo thành công — không rollback, PM có thể gắn lại thủ công sau.
          toast.warning(
            'Task đã tạo nhưng chưa gắn được vào cam kết, thử gắn lại sau',
          );
        }
      }
      return task;
    },
    onSuccess: () => toast.success('Đã tạo task'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo task')),
  });
}

export function useConfirmLinkExistingCommitment() {
  return useMutation({
    mutationFn: (input: {
      commitmentId: string;
      sourceRef: CreateSourceRefInput;
    }) => commitmentsApi.linkSourceRef(input.commitmentId, input.sourceRef),
    onSuccess: () => toast.success('Đã gắn nguồn vào cam kết'),
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể gắn nguồn vào cam kết')),
  });
}
