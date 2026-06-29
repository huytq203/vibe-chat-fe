'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
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

  const headerColor = column.color ?? '#6D4AFF';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-[312px] shrink-0 rounded-2xl border border-[#E9E5F6] bg-[#F8F7FC] flex flex-col overflow-hidden h-full',
        isOver && 'ring-2 ring-[#6D4AFF]/40',
      )}
    >
      {/* Colored header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center">
          <span className="text-white font-semibold text-sm">{column.name}</span>
          <span className="bg-white/25 text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-2">
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
          <button
            type="button"
            className="text-white opacity-80 hover:opacity-100 p-0.5"
            aria-label="Tùy chọn"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
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
          <div className="border-2 border-[#6D4AFF] rounded-[15px] p-3 bg-white">
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
              className="w-full text-sm text-[#2E2A4D] outline-none placeholder:text-[#9A96B0]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
