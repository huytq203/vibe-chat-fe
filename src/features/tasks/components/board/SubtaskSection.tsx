'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { useSubtasks, useCreateSubtask } from '../../hooks/useSubtasks';
import {
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
} from '../../hooks/useTaskDetail';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { SubtaskItem, TaskPriority } from '../../types';

/** Màu chấm ưu tiên — đồng bộ với sidebar (P1 đỏ, P2 vàng, P3 xanh). */
const PRIORITY_DOT: Record<TaskPriority, string> = {
  P1: '#EF4444',
  P2: '#F59E0B',
  P3: '#22C55E',
};

interface SubtaskSectionProps {
  projectId: string;
  /** Task cha chứa các subtask này (subtask giờ là task thật). */
  parentTaskId: string;
}

export function SubtaskSection({ projectId, parentTaskId }: SubtaskSectionProps) {
  const { data: subtasks = [], isLoading } = useSubtasks(projectId, parentTaskId);
  const createSubtask = useCreateSubtask(projectId, parentTaskId);
  const [draft, setDraft] = useState('');

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.status === 'DONE').length;

  const handleAdd = () => {
    const title = draft.trim();
    if (!title || createSubtask.isPending) return;
    createSubtask.mutate(title, { onSuccess: () => setDraft('') });
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Task con</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!isLoading && total === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có task con</p>
        )}
        {subtasks.map((sub) => (
          <SubtaskRow
            key={sub.id}
            projectId={projectId}
            parentTaskId={parentTaskId}
            sub={sub}
          />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Thêm task con…"
          className="h-8 flex-1"
        />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function SubtaskRow({
  projectId,
  parentTaskId,
  sub,
}: {
  projectId: string;
  parentTaskId: string;
  sub: SubtaskItem;
}) {
  const qc = useQueryClient();
  const openSubtask = useTasksUIStore((s) => s.openSubtask);
  const complete = useCompleteTask(projectId, sub.id);
  const reopen = useReopenTask(projectId, sub.id);
  const del = useDeleteTask(projectId);
  const pending = complete.isPending || reopen.isPending || del.isPending;

  const isDone = sub.status === 'DONE';

  // Sau khi đổi trạng thái/xóa subtask → refresh danh sách con của task cha
  const refreshList = () =>
    void qc.invalidateQueries({
      queryKey: ['tasks', projectId, parentTaskId, 'subtasks'],
    });

  const toggleDone = () => {
    if (pending) return;
    if (isDone) reopen.mutate(undefined, { onSuccess: refreshList });
    else complete.mutate(undefined, { onSuccess: refreshList });
  };

  return (
    <div className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50">
      <button
        type="button"
        onClick={toggleDone}
        disabled={pending}
        aria-label={isDone ? `Mở lại ${sub.title}` : `Hoàn thành ${sub.title}`}
        className="shrink-0 disabled:opacity-50"
      >
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        )}
      </button>

      <button
        type="button"
        onClick={() => openSubtask(sub.id)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm hover:text-primary',
          isDone && 'text-muted-foreground line-through',
        )}
      >
        {/* Ưu tiên: chấm màu P1/P2/P3 */}
        {sub.priority && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_DOT[sub.priority] }}
            title={`Ưu tiên ${sub.priority}`}
          />
        )}
        <span className="truncate">{sub.title}</span>
        {/* Nhãn */}
        {sub.tags.map((t) => (
          <span
            key={t.id}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${t.color}22`, color: t.color }}
          >
            {t.name}
          </span>
        ))}
        {sub.status === 'IN_REVIEW' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
            <Clock className="h-3 w-3" /> Chờ duyệt
          </span>
        )}
        {sub.subtaskCount > 0 && (
          <span className="ml-1 shrink-0 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {sub.subtaskCount}
          </span>
        )}
      </button>

      {/* Avatar người thực hiện (tối đa 3) */}
      <div className="flex shrink-0 -space-x-1.5">
        {sub.assignees.slice(0, 3).map((a) => (
          <Avatar
            key={a.userId}
            src={a.avatarUrl ?? undefined}
            alt={a.displayName}
            fallback={a.displayName.charAt(0).toUpperCase()}
            className="h-5 w-5 border border-background text-[9px]"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => del.mutate(sub.id, { onSuccess: refreshList })}
        disabled={pending}
        aria-label={`Xoá ${sub.title}`}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
