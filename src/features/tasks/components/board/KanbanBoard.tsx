'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Column } from './Column';
import { TaskCardView } from './TaskCard';
import { useBoard } from '../../hooks/useBoard';
import { useCreateColumn } from '../../hooks/useCreateColumn';
import { useMoveTask } from '../../hooks/useMoveTask';
import type { BoardTask } from '../../types';

export function KanbanBoard({ projectId }: { projectId: string }) {
  const { data: board, isLoading } = useBoard(projectId);
  const createColumn = useCreateColumn(projectId);
  const moveTask = useMoveTask(projectId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [newCol, setNewCol] = useState('');
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  // Demo UI (chưa có API deleteColumn): cột đã xóa giữ ở local state.
  const [hiddenColumnIds, setHiddenColumnIds] = useState<ReadonlySet<string>>(new Set());

  const handleDeleteColumn = (columnId: string) => {
    setHiddenColumnIds((prev) => new Set(prev).add(columnId));
  };

  const handleAddColumn = async () => {
    const n = newCol.trim();
    if (!n || createColumn.isPending) return;
    try {
      await createColumn.mutateAsync({ name: n });
      setNewCol('');
    } catch {
      // Lỗi đã phản ánh qua createColumn.isError; giữ input để user thử lại.
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const found = board?.columns
      .flatMap((c) => c.tasks)
      .find((t) => t.id === id);
    setActiveTask(found ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const taskId = String(e.active.id);
    const targetColumnId = e.over ? String(e.over.id) : null;
    if (!targetColumnId || !board) return;
    const fromColumnId = (e.active.data.current as { columnId?: string } | undefined)?.columnId;
    if (fromColumnId === targetColumnId) return; // cùng cột: bỏ qua (sắp xếp trong cột làm ở plan sau)
    const targetCol = board.columns.find((c) => c.id === targetColumnId);
    const last = targetCol?.tasks[targetCol.tasks.length - 1];
    const position = (last?.position ?? 0) + 1000;
    moveTask.mutate({ taskId, columnId: targetColumnId, position });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Đang tải board…</div>;
  if (!board) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex h-full items-start gap-[18px] overflow-x-auto bg-muted px-7 py-6">
        {board.columns
          .filter((column) => !hiddenColumnIds.has(column.id))
          .map((column) => (
            <Column
              key={column.id}
              projectId={projectId}
              column={column}
              onDelete={() => handleDeleteColumn(column.id)}
            />
          ))}
        <div className="flex w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed border-border p-2">
          <input
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddColumn();
            }}
            placeholder="Tên cột mới…"
            className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => void handleAddColumn()}
            aria-label="Thêm cột"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bản nổi của thẻ đang kéo — portal ra ngoài mọi overflow nên không bị clip. */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardView
            task={activeTask}
            className="w-[288px] rotate-2 cursor-grabbing shadow-2xl"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
