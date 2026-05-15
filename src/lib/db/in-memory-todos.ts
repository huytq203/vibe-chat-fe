import 'server-only';
import type { Todo } from '@/features/todo/types';

/**
 * In-memory store cho example. Production: thay bằng Prisma trong file này,
 * call site không đổi (đó là điểm của wrapper layer).
 */
const todos = new Map<string, Todo>([
  ['t-1', { id: 't-1', title: 'Đọc CLAUDE.md', done: true, createdAt: new Date('2026-05-01').toISOString() }],
  ['t-2', { id: 't-2', title: 'Đọc WORKFLOW.md', done: false, createdAt: new Date('2026-05-02').toISOString() }],
  ['t-3', { id: 't-3', title: 'Build feature đầu tiên', done: false, createdAt: new Date('2026-05-03').toISOString() }],
]);

export const todoDb = {
  list(): Todo[] {
    return Array.from(todos.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  get(id: string): Todo | null {
    return todos.get(id) ?? null;
  },

  create(input: { title: string }): Todo {
    const id = `t-${crypto.randomUUID()}`;
    const todo: Todo = { id, title: input.title, done: false, createdAt: new Date().toISOString() };
    todos.set(id, todo);
    return todo;
  },

  toggle(id: string): Todo | null {
    const todo = todos.get(id);
    if (!todo) return null;
    const updated: Todo = { ...todo, done: !todo.done };
    todos.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return todos.delete(id);
  },
};
