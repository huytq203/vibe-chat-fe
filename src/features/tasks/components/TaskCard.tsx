'use client';

import { useDraggable } from '@dnd-kit/core';
import { CheckSquare, MessageSquare, Pin } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import type { BoardTask } from '../types';

const PRIORITY_CONFIG = {
  P1: { bg: 'bg-red-50', text: 'text-red-600', dot: '#EF4444', label: 'Ưu tiên 1' },
  P2: { bg: 'bg-orange-50', text: 'text-orange-600', dot: '#F97316', label: 'Ưu tiên 2' },
  P3: { bg: 'bg-green-50', text: 'text-green-600', dot: '#22C55E', label: 'Ưu tiên 3' },
} as const;

function formatDueDate(dateStr: string): { label: string; isPast: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  const isPast = date < now;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return { label: `${day}/${month}`, isPast };
}

function AssigneeAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const initials = displayName.charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-6 h-6 rounded-full border-2 border-background object-cover"
      />
    );
  }
  // Generate a color from displayName for the fallback div
  const colors = ['var(--primary)', '#F97316', '#22C55E', '#EF4444', '#3B82F6', '#A855F7'];
  const colorIndex = displayName.charCodeAt(0) % colors.length;
  return (
    <div
      className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-primary-foreground text-[9px] font-semibold"
      style={{ backgroundColor: colors[colorIndex] }}
    >
      {initials}
    </div>
  );
}

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

  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
  const visibleAssignees = task.assignees.slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-secondary rounded-[15px] border border-border shadow-[0_1px_3px_rgba(80,60,160,0.08)] p-3 cursor-pointer',
        isDragging && 'opacity-50',
      )}
      onClick={() => openTask(task.id)}
    >
      {/* Priority badge */}
      {priorityConfig && (
        <div
          className={cn(
            'flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 mb-2 w-fit',
            priorityConfig.bg,
            priorityConfig.text,
          )}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: priorityConfig.dot }}
          />
          {priorityConfig.label}
        </div>
      )}

      {/* Tags row */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-[11px] rounded-full px-2 py-0.5 font-medium"
              style={{ color: tag.color, backgroundColor: tag.color + '20' }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-1.5 mb-3">
        {task.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
        <span className="text-[14.5px] font-semibold text-foreground leading-snug">
          {task.title}
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {/* Left: counts + due date */}
        <div className="flex items-center gap-2">
          {task.checklistCount > 0 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {task.checklistCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.commentCount}
            </span>
          )}
          {dueDateInfo && (
            <span
              className={cn(
                'bg-muted text-[11px] rounded-full px-2 py-0.5',
                dueDateInfo.isPast ? 'text-red-500' : 'text-muted-foreground',
              )}
            >
              {dueDateInfo.label}
            </span>
          )}
        </div>

        {/* Right: assignee avatars */}
        {visibleAssignees.length > 0 && (
          <div className="flex -space-x-1">
            {visibleAssignees.map((assignee) => (
              <AssigneeAvatar
                key={assignee.userId}
                displayName={assignee.displayName}
                avatarUrl={assignee.avatarUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drag handle — only when not pinned */}
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
