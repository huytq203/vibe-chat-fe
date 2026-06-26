'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TaskCard } from './TaskCard';
import { useCreateTask } from '../hooks/useCreateTask';
import type { BoardColumn } from '../types';

export function Column({ projectId, column }: { projectId: string; column: BoardColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const createTask = useCreateTask(projectId);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const t = title.trim();
    if (!t || createTask.isPending) return;
    try {
      await createTask.mutateAsync({ title: t, columnId: column.id });
      setTitle('');
      setAdding(false);
    } catch {
      // Lỗi đã phản ánh qua createTask.isError; giữ input để user thử lại.
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-xl bg-muted/40 p-2',
        isOver && 'ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <span
          className="text-sm font-semibold"
          style={column.color ? { color: column.color } : undefined}
        >
          {column.name}
        </span>
        <span className="text-xs text-muted-foreground">{column.tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
      {adding ? (
        <div className="p-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
            onBlur={() => setAdding(false)}
            placeholder="Tiêu đề task…"
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Thêm task
        </button>
      )}
    </div>
  );
}
