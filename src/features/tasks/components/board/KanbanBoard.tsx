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
import { Plus, X } from 'lucide-react';
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
  const [addingColumn, setAddingColumn] = useState(false);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  const handleAddColumn = async () => {
    const n = newCol.trim();
    if (!n || createColumn.isPending) return;
    try {
      await createColumn.mutateAsync({ name: n });
      setNewCol('');
      setAddingColumn(false);
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
      <div
        className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto overscroll-x-contain bg-muted/50 p-4 sm:px-5"
        role="region"
        aria-label="Bảng nhiệm vụ"
      >
        {board.columns.map((column) => (
          <Column key={column.id} projectId={projectId} column={column} />
        ))}
        <div className="w-64 shrink-0">
          {addingColumn ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddColumn();
              }}
              className="rounded-xl border border-border bg-background p-2"
            >
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newCol}
                  onChange={(e) => setNewCol(e.target.value)}
                  placeholder="Tên cột mới…"
                  aria-label="Tên cột mới"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNewCol('');
                    setAddingColumn(false);
                  }}
                  aria-label="Hủy thêm cột"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newCol.trim() || createColumn.isPending}
                className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {createColumn.isPending ? 'Đang tạo…' : 'Tạo cột'}
              </button>
              {createColumn.isError && (
                <p className="mt-2 text-xs text-danger">Không tạo được cột. Vui lòng thử lại.</p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-background hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Thêm cột
            </button>
          )}
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
