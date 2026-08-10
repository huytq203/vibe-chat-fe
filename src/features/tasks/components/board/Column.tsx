'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TaskCard } from './TaskCard';
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
import type { BoardColumn } from '../../types';

interface ColumnProps {
  projectId: string;
  column: BoardColumn;
}

export function Column({ projectId, column }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const createTask = useCreateTask(projectId);
  const updateColumn = useUpdateColumn(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  // Icon chưa có field backend nên vẫn giữ ở local state; tên + màu persist qua updateColumn.
  const [iconKey, setIconKey] = useState<ColumnIconKey>(DEFAULT_COLUMN_ICON);
  const [headerColor, setHeaderColor] = useState<string>(column.color ?? DEFAULT_COLUMN_COLOR);
  const [name, setName] = useState(column.name);
  const [editingName, setEditingName] = useState(false);
  const HeaderIcon = COLUMN_ICONS[iconKey];

  const commitName = () => {
    setEditingName(false);
    const trimmed = name.trim();
    // Rỗng hoặc không đổi → giữ tên cũ, không gọi API.
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    setName(trimmed); // optimistic — board sẽ refetch sau khi mutation thành công
    updateColumn.mutate(
      { columnId: column.id, name: trimmed },
      { onError: () => setName(column.name) }, // lỗi → khôi phục tên cũ
    );
  };

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
      // Lỗi đã phản ánh qua createTask.isError; giữ input để user thử lại.
    }
  };

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={`Cột ${name}`}
      className={cn(
        'flex min-h-[180px] max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background sm:w-[288px]',
        isOver && 'border-primary ring-2 ring-primary/20',
      )}
    >
      {/* Column identity uses a quiet accent instead of a full saturated band. */}
      <div
        className="flex items-center justify-between border-t-[3px] px-3 py-2.5"
        style={{ borderTopColor: headerColor }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <HeaderIcon className="h-4 w-4 shrink-0" style={{ color: headerColor }} />
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setName(column.name);
                  setEditingName(false);
                }
              }}
              onBlur={commitName}
              aria-label="Tên cột"
              className="min-w-0 rounded bg-muted px-1 text-sm font-semibold text-foreground outline-none ring-1 ring-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Click để đổi tên"
              className="-mx-1 truncate rounded px-1 text-sm font-semibold text-foreground hover:bg-muted"
            >
              {name}
            </button>
          )}
          <span className="ml-1 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Thêm task"
          >
            <Plus className="h-4 w-4" />
          </button>
          <ColumnHeaderMenu
            columnName={name}
            iconKey={iconKey}
            color={headerColor}
            isUpdating={updateColumn.isPending}
            isDeleting={deleteColumn.isPending}
            onIconChange={setIconKey}
            onColorChange={handleColorChange}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex min-h-20 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} isDoneColumn={column.isDoneCol} />
        ))}
        {column.tasks.length === 0 && !adding && (
          <div className="grid min-h-20 flex-1 place-items-center rounded-lg border border-dashed border-border px-4 text-center text-xs leading-relaxed text-muted-foreground">
            Thả nhiệm vụ vào đây hoặc bấm + để tạo.
          </div>
        )}
      </div>

      {/* Add task input */}
      {adding && (
        <div className="px-2.5 pb-2.5">
          <div className="rounded-xl border border-primary bg-background p-3">
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
              className="w-full text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}
    </div>
  );
}
