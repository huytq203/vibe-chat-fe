import { describe, expect, it } from 'vitest';
import { countActive, filterTodos } from './utils';
import type { Todo } from './types';

const sample: Todo[] = [
  { id: '1', title: 'a', done: false, createdAt: '2026-01-01' },
  { id: '2', title: 'b', done: true, createdAt: '2026-01-02' },
  { id: '3', title: 'c', done: false, createdAt: '2026-01-03' },
];

describe('todo/utils', () => {
  it('filterTodos: all → trả về full list', () => {
    expect(filterTodos(sample, 'all')).toHaveLength(3);
  });

  it('filterTodos: active → chỉ trả done=false', () => {
    expect(filterTodos(sample, 'active').every((t) => !t.done)).toBe(true);
  });

  it('filterTodos: done → chỉ trả done=true', () => {
    expect(filterTodos(sample, 'done').every((t) => t.done)).toBe(true);
  });

  it('countActive: đếm done=false', () => {
    expect(countActive(sample)).toBe(2);
  });

  it('countActive: list rỗng → 0', () => {
    expect(countActive([])).toBe(0);
  });
});
