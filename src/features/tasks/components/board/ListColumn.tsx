'use client';

import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
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
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { BoardColumn, BoardTask } from '../../types';

function TaskRow({ task, dotColor }: { task: BoardTask; dotColor: string }) {
  const openTask = useTasksUIStore((s) => s.openTask);
  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const assignees = task.assignees.slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-center gap-3 border-t border-border px-[18px] py-3.5 text-left transition-colors hover:bg-muted/60"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-foreground">
        {task.title}
      </span>

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
        <span className="flex shrink-0 gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
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
    </button>
  );
}

interface ListColumnProps {
  projectId: string;
  column: BoardColumn;
  onDelete: () => void;
}

export function ListColumn({ projectId, column, onDelete }: ListColumnProps) {
  const createTask = useCreateTask(projectId);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  // Demo UI (chưa có API updateColumn): icon + màu header giữ ở local state.
  const [iconKey, setIconKey] = useState<ColumnIconKey>(DEFAULT_COLUMN_ICON);
  const [headerColor, setHeaderColor] = useState<string>(column.color ?? DEFAULT_COLUMN_COLOR);
  const HeaderIcon = COLUMN_ICONS[iconKey];

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
    <div className="mb-4 overflow-hidden rounded-[14px] border border-border bg-secondary shadow-[0_2px_12px_rgba(80,60,160,0.05)]">
      <div
        className="flex items-center justify-between gap-2 px-[18px] py-3"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <HeaderIcon className="h-[17px] w-[17px] shrink-0 text-white" />
          <span className="truncate text-[14.5px] font-bold text-white">{column.name}</span>
          <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold text-white">
            {column.tasks.length}
          </span>
        </div>
        <ColumnHeaderMenu
          iconKey={iconKey}
          color={headerColor}
          onIconChange={setIconKey}
          onColorChange={setHeaderColor}
          onDelete={onDelete}
        />
      </div>

      {column.tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          dotColor={task.priority ? PRIORITY_CONFIG[task.priority].dot : headerColor}
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
