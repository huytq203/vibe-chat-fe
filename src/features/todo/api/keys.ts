import type { TodoFilter } from '../types';

/**
 * Query key factory — KHÔNG hard-code mảng string trong code feature.
 * Khi cần invalidate: queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
 */
export const todoKeys = {
  all: ['todo'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filter: TodoFilter) => [...todoKeys.lists(), { filter }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
} as const;
