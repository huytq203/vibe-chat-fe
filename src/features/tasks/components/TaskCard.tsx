'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import type { BoardTask } from '../types';

export function TaskCard({ task }: { task: BoardTask }) {
  const openTask = useTasksUIStore((s) => s.openTask);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled: task.isPinned,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-2 rounded-lg border border-border bg-background p-3 text-sm shadow-sm',
        task.isPinned ? 'border-primary/50 ring-1 ring-primary/30' : '',
        isDragging && 'opacity-50',
      )}
    >
      <div
        className="flex cursor-pointer items-start gap-2"
        onClick={() => openTask(task.id)}
      >
        {task.isPinned && <span className="text-xs text-primary">📌</span>}
        <span className="flex-1">{task.title}</span>
      </div>
      {/* Drag handle chỉ active khi không bị pin */}
      {!task.isPinned && (
        <div
          {...listeners}
          {...attributes}
          className="mt-1 h-3 cursor-grab active:cursor-grabbing"
          aria-label="Kéo để di chuyển"
        />
      )}
    </div>
  );
}
