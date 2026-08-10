'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CheckCircle2, CheckSquare, Clock, MessageSquare, Pin } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { BoardTask } from '../../types';

export const PRIORITY_CONFIG = {
  P1: { bg: 'bg-danger/10', text: 'text-foreground', dot: '#EF4444', label: 'Ưu tiên cao' },
  P2: { bg: 'bg-warning/15', text: 'text-foreground', dot: '#F97316', label: 'Ưu tiên trung bình' },
  P3: { bg: 'bg-success/10', text: 'text-foreground', dot: '#22C55E', label: 'Ưu tiên thấp' },
} as const;

export function formatDueDate(dateStr: string): { label: string; isPast: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  const isPast = date < now;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return { label: `${day}/${month}`, isPast };
}

export function AssigneeAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
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

/* ─── Presentational card (no DnD) — reused by draggable wrapper & DragOverlay ─── */
interface TaskCardViewProps extends HTMLAttributes<HTMLDivElement> {
  task: BoardTask;
  /** Cột chứa task là cột Done → mọi task trong cột coi như hoàn thành */
  isDoneColumn?: boolean;
}

export const TaskCardView = forwardRef<HTMLDivElement, TaskCardViewProps>(
  ({ task, isDoneColumn = false, className, ...rest }, ref) => {
    const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
    const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
    const visibleAssignees = task.assignees.slice(0, 3);
    // Task done khi đã có completedAt HOẶC nằm trong cột Done
    const isDone = task.completedAt !== null || isDoneColumn;
    // Chờ owner duyệt → chip amber (không áp dụng khi task đã done)
    const isInReview = task.status === 'IN_REVIEW' && !isDone;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...rest}
      >
        <div className="mb-2.5 flex items-start gap-1.5">
          {task.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
          {isDone && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />}
          <span
            className={cn(
              'text-sm font-semibold leading-snug',
              isDone ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {task.title}
          </span>
        </div>

        {(priorityConfig || isInReview) && (
          <div className="mb-2 flex flex-wrap gap-1">
            {priorityConfig && (
              <div
                className={cn(
                  'flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  priorityConfig.bg,
                  priorityConfig.text,
                )}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: priorityConfig.dot }}
                />
                {priorityConfig.label}
              </div>
            )}

            {isInReview && (
              <div className="flex w-fit items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                <Clock className="h-3 w-3" />
                Chờ duyệt
              </div>
            )}
          </div>
        )}

        {task.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
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
      </div>
    );
  },
);
TaskCardView.displayName = 'TaskCardView';

/* ─── Draggable card — whole card is the drag handle; click opens detail ─── */
export function TaskCard({ task, isDoneColumn }: { task: BoardTask; isDoneColumn?: boolean }) {
  const openTask = useTasksUIStore((s) => s.openTask);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled: task.isPinned,
  });

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      isDoneColumn={isDoneColumn}
      onClick={() => openTask(task.id)}
      className={cn(
        task.isPinned ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        // Khi đang kéo: thẻ gốc mờ làm chỗ đặt (placeholder); bản nổi do DragOverlay vẽ.
        isDragging && 'opacity-40',
      )}
      {...listeners}
      {...attributes}
    />
  );
}
