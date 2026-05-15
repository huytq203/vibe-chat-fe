import type { Todo, TodoFilter } from './types';

export function filterTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'done') return todos.filter((t) => t.done);
  return todos;
}

export function countActive(todos: Todo[]): number {
  return todos.reduce((acc, t) => (t.done ? acc : acc + 1), 0);
}
