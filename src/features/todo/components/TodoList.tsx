'use client';

import { Spinner } from '@/components/ui/spinner/Spinner';
import { useTodos } from '../api/queries';
import { useTodoUIStore } from '../stores/todo-ui.store';
import { filterTodos } from '../utils';
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

type TodoListProps = {
  /**
   * Initial data từ Server Component (pre-fetch).
   * Cho phép render ngay không cần client fetch.
   */
  initialTodos: Todo[];
};

/**
 * 4-State Rule (xem WORKFLOW.md):
 *  - Loading: spinner
 *  - Error: fallback inline
 *  - Empty: EmptyState
 *  - Data: list
 */
export function TodoList({ initialTodos }: TodoListProps) {
  const filter = useTodoUIStore((s) => s.filter);
  const query = useTodos(filter, initialTodos);

  if (query.isPending) {
    return (
      <div className="flex justify-center p-6" role="status" aria-live="polite">
        <Spinner />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Không tải được danh sách. <button className="underline" onClick={() => query.refetch()}>Thử lại</button>
      </div>
    );
  }

  const items = filterTodos(query.data ?? [], filter);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Chưa có todo nào. Thêm cái đầu tiên ở trên ↑
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Danh sách todo">
      {items.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
