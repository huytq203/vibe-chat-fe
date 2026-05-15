'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleTodoAction, deleteTodoAction } from '../actions';
import type { Todo } from '../types';
import { todoKeys } from './keys';

/**
 * Mutation gọi Server Action — không tự fetch route handler.
 * Optimistic update để UX mượt.
 */
export function useToggleTodo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await toggleTodoAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: todoKeys.lists() });
      const snapshots = qc.getQueriesData<Todo[]>({ queryKey: todoKeys.lists() });
      qc.setQueriesData<Todo[]>({ queryKey: todoKeys.lists() }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) ?? old,
      );
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTodoAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}
