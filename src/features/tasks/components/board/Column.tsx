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
      className={cn(
        'w-[312px] shrink-0 rounded-2xl border border-border bg-muted flex flex-col overflow-hidden h-full',
        isOver && 'ring-2 ring-primary/40',
      )}
    >
      {/* Colored header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <HeaderIcon className="h-4 w-4 text-white shrink-0" />
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
              className="min-w-0 bg-[rgba(255,255,255,0.2)] text-white font-semibold text-sm rounded px-1 outline-none placeholder:text-white/60"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Click để đổi tên"
              className="truncate text-white font-semibold text-sm rounded px-1 -mx-1 hover:bg-[rgba(255,255,255,0.15)]"
            >
              {name}
            </button>
          )}
          <span className="bg-[rgba(255,255,255,0.25)] text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-1 shrink-0">
            {column.tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-white opacity-80 hover:opacity-100 p-0.5"
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
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Add task input */}
      {adding && (
        <div className="px-3 pb-3">
          <div className="border-2 border-primary rounded-[15px] p-3 bg-secondary">
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
