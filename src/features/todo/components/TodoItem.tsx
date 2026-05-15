'use client';

import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { cn } from '@/lib/utils/cn';
import type { Todo } from '../types';
import { useDeleteTodo, useToggleTodo } from '../api/mutations';

type TodoItemProps = {
  todo: Todo;
};

export function TodoItem({ todo }: TodoItemProps) {
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();

  const handleToggle = () => toggle.mutate(todo.id);
  const handleDelete = () => remove.mutate(todo.id);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <Button
        variant={todo.done ? 'solid' : 'outline'}
        size="sm"
        aria-label={todo.done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
        onClick={handleToggle}
        disabled={toggle.isPending}
      >
        <Check className="h-4 w-4" />
      </Button>

      <span className={cn('flex-1 text-sm', todo.done && 'line-through text-muted-foreground')}>
        {todo.title}
      </span>

      {todo.done && <Badge variant="success">Done</Badge>}

      <Button
        variant="ghost"
        size="sm"
        aria-label="Xóa"
        onClick={handleDelete}
        disabled={remove.isPending}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}
