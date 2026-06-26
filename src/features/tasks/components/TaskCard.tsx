'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import type { BoardTask } from '../types';

export function TaskCard({ task }: { task: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled: task.isPinned, // pin → không kéo (#7)
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'mb-2 rounded-lg border border-border bg-background p-3 text-sm shadow-sm',
        task.isPinned ? 'border-primary/50 ring-1 ring-primary/30' : 'cursor-grab',
        isDragging && 'opacity-50',
      )}
    >
      {task.isPinned && <span className="mr-1 text-xs text-primary">📌</span>}
      {task.title}
    </div>
  );
}
