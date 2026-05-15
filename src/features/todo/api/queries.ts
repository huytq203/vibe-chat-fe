'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { Todo, TodoFilter } from '../types';
import { todoKeys } from './keys';

/**
 * Hook lấy danh sách todo.
 * Hỗ trợ `initialData` để Server Component pre-fetch + hydrate.
 */
export function useTodos(filter: TodoFilter, initialData?: Todo[]) {
  return useQuery({
    queryKey: todoKeys.list(filter),
    queryFn: () => httpClient.get<Todo[]>('/api/todos', { query: { filter } }),
    initialData,
  });
}

export function useTodo(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => httpClient.get<Todo>(`/api/todos/${id}`),
    enabled: Boolean(id),
  });
}
