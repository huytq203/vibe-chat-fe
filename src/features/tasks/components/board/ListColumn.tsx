'use client';

import { useState } from 'react';
import { CheckCircle2, CheckSquare, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  AssigneeAvatar,
  PRIORITY_CONFIG,
  formatDueDate,
} from './TaskCard';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import {
  COLUMN_ICONS,
  DEFAULT_COLUMN_COLOR,
  DEFAULT_COLUMN_ICON,
  type ColumnIconKey,
} from './column-style';
import { useCreateTask } from '../../hooks/useCreateTask';
import { useDeleteColumn } from '../../hooks/useDeleteColumn';
import { useUpdateColumn } from '../../hooks/useUpdateColumn';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { BoardColumn, BoardTask } from '../../types';

function TaskRow({
  task,
  dotColor,
  isDoneColumn,
}: {
  task: BoardTask;
  dotColor: string;
  /** Cột chứa task là cột Done → mọi task trong cột coi như hoàn thành */
  isDoneColumn: boolean;
}) {
  const openTask = useTasksUIStore((s) => s.openTask);
  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const assignees = task.assignees.slice(0, 3);
  // Task done khi đã có completedAt HOẶC nằm trong cột Done
  const isDone = task.completedAt !== null || isDoneColumn;
  // Chờ owner duyệt → chip amber (không áp dụng khi task đã done)
  const isInReview = task.status === 'IN_REVIEW' && !isDone;

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-start gap-3 border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      {isDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[14.5px] font-semibold',
          isDone ? 'line-through text-muted-foreground' : 'text-foreground',
        )}
      >
        {task.title}
      </span>

      <span className="flex max-w-[58%] shrink-0 flex-wrap items-center justify-end gap-1.5">
        {isInReview && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-foreground">
            <Clock className="h-3 w-3" />
            Chờ duyệt
          </span>
        )}

        {priority && (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold',
              priority.bg,
              priority.text,
            )}
          >
            {priority.label}
          </span>
        )}

        {task.tags.length > 0 && (
          <span className="hidden shrink-0 gap-1.5 sm:flex">
            {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
            ))}
            {task.tags.length > 2 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                +{task.tags.length - 2}
              </span>
            )}
          </span>
        )}

        {task.checklistCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-muted-foreground">
            <CheckSquare className="h-3.5 w-3.5" />
            {task.checklistCount}
          </span>
        )}

        {due && (
          <span
            className={cn(
              'shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-semibold',
              due.isPast ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {due.label}
          </span>
        )}

        {assignees.length > 0 && (
          <span className="flex shrink-0 -space-x-1.5">
            {assignees.map((a) => (
              <AssigneeAvatar key={a.userId} displayName={a.displayName} avatarUrl={a.avatarUrl} />
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

interface ListColumnProps {
  projectId: string;
  column: BoardColumn;
}

export function ListColumn({ projectId, column }: ListColumnProps) {
  const createTask = useCreateTask(projectId);
  const updateColumn = useUpdateColumn(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  // Icon chưa có field backend nên vẫn giữ ở local state; màu persist qua updateColumn.
  const [iconKey, setIconKey] = useState<ColumnIconKey>(DEFAULT_COLUMN_ICON);
  const [headerColor, setHeaderColor] = useState<string>(column.color ?? DEFAULT_COLUMN_COLOR);
  const HeaderIcon = COLUMN_ICONS[iconKey];

  const handleColorChange = (nextColor: string) => {
    if (updateColumn.isPending || nextColor === headerColor) return;
    const prevColor = headerColor;
    setHeaderColor(nextColor); // optimistic
    updateColumn.mutate(
      { columnId: column.id, color: nextColor },
      { onError: () => setHeaderColor(prevColor) }, // lỗi → trả lại màu cũ
    );
  };

  // Trả promise để ColumnHeaderMenu đóng dialog khi thành công / hiện lỗi khi thất bại.
  const handleDelete = async (): Promise<void> => {
    await deleteColumn.mutateAsync(column.id);
  };

  const handleAdd = async () => {
    const t = title.trim();
    if (!t || createTask.isPending) return;
    try {
      await createTask.mutateAsync({ title: t, columnId: column.id });
      setTitle('');
      setAdding(false);
    } catch {
      // Lỗi phản ánh qua createTask.isError; giữ input để user thử lại.
    }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-background">
      <div
        className="flex items-center justify-between gap-2 border-t-[3px] px-4 py-2.5"
        style={{ borderTopColor: headerColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <HeaderIcon className="h-4 w-4 shrink-0" style={{ color: headerColor }} />
          <span className="truncate text-sm font-bold text-foreground">{column.name}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
        <ColumnHeaderMenu
          columnName={column.name}
          iconKey={iconKey}
          color={headerColor}
          isUpdating={updateColumn.isPending}
          isDeleting={deleteColumn.isPending}
          onIconChange={setIconKey}
          onColorChange={handleColorChange}
          onDelete={handleDelete}
        />
      </div>

      {column.tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          dotColor={task.priority ? PRIORITY_CONFIG[task.priority].dot : headerColor}
          isDoneColumn={column.isDoneCol}
        />
      ))}

      {adding ? (
        <div className="border-t border-border px-[18px] py-2.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
              if (e.key === 'Escape') setAdding(false);
            }}
            onBlur={() => setAdding(false)}
            placeholder="Tiêu đề task…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1.5 border-t border-border px-[18px] py-3 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary"
        >
          <Plus className="h-[15px] w-[15px]" />
          Thêm nhiệm vụ
        </button>
      )}
    </div>
  );
}
