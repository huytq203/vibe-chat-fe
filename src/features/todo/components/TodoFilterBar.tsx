'use client';

import { Button } from '@/components/ui/button/Button';
import { useTodoUIStore } from '../stores/todo-ui.store';
import type { TodoFilter } from '../types';

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang làm' },
  { value: 'done', label: 'Đã xong' },
];

export function TodoFilterBar() {
  const filter = useTodoUIStore((s) => s.filter);
  const setFilter = useTodoUIStore((s) => s.setFilter);

  return (
    <div className="flex gap-2" role="tablist" aria-label="Lọc todo">
      {FILTERS.map((f) => (
        <Button
          key={f.value}
          variant={filter === f.value ? 'solid' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={filter === f.value}
          onClick={() => setFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
