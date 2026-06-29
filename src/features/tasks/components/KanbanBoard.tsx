'use client';

import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Column } from './Column';
import { useBoard } from '../hooks/useBoard';
import { useCreateColumn } from '../hooks/useCreateColumn';
import { useMoveTask } from '../hooks/useMoveTask';

export function KanbanBoard({ projectId }: { projectId: string }) {
  const { data: board, isLoading } = useBoard(projectId);
  const createColumn = useCreateColumn(projectId);
  const moveTask = useMoveTask(projectId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [newCol, setNewCol] = useState('');

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

  const handleDragEnd = (e: DragEndEvent) => {
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full items-start gap-[18px] overflow-x-auto bg-[#F4F3FB] px-7 py-6">
        {board.columns.map((column) => (
          <Column key={column.id} projectId={projectId} column={column} />
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
    </DndContext>
  );
}
