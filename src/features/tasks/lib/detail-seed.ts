import type { QueryClient } from '@tanstack/react-query';
import type { TaskDetail } from '../types';

export function seedFromDetail<T>(
  qc: QueryClient,
  projectId: string,
  taskId: string,
  pick: (detail: TaskDetail) => T | undefined,
): { initialData?: T; initialDataUpdatedAt?: number } {
  const state = qc.getQueryState<TaskDetail>(['tasks', projectId, taskId, 'detail']);
  if (!state?.data) return {};

  const initialData = pick(state.data);
  if (initialData === undefined) return {};

  return { initialData, initialDataUpdatedAt: state.dataUpdatedAt };
}
