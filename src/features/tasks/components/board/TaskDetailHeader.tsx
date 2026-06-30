'use client';

import { Check, ChevronDown, UserPlus2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { useBoard } from '../../hooks/useBoard';
import { useMoveTask } from '../../hooks/useMoveTask';
import { useMembers } from '../../hooks/useMembers';
import { useAssignees, useAddAssignee } from '../../hooks/useAssignees';
import type { BoardColumn, TaskDetail } from '../../types';

interface TaskDetailHeaderProps {
  projectId: string;
  taskId: string;
  task: TaskDetail;
}

export function TaskDetailHeader({ projectId, taskId, task }: TaskDetailHeaderProps) {
  const { data: board } = useBoard(projectId);
  const moveTask = useMoveTask(projectId);
  const { data: members = [] } = useMembers(projectId);
  const { data: assignees = [] } = useAssignees(projectId, taskId);
  const addAssignee = useAddAssignee(projectId, taskId);

  const columns = board?.columns ?? [];
  const currentColumn = columns.find((c) => c.id === task.columnId);

  const handleMove = (col: BoardColumn) => {
    if (col.id === task.columnId) return;
    const last = col.tasks[col.tasks.length - 1];
    moveTask.mutate({ taskId, columnId: col.id, position: (last?.position ?? 0) + 1000 });
  };

  const available = members.filter((m) => !assignees.some((a) => a.userId === m.userId));

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
      {/* Status (column) selector */}
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Check className="h-4 w-4" />
            {currentColumn?.name ?? 'Trạng thái'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" showArrow={false} align="start">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chuyển trạng thái
          </p>
          {columns.map((col) => {
            const active = col.id === task.columnId;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleMove(col)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted',
                  active && 'font-semibold text-primary',
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: col.color ?? 'var(--primary)' }}
                />
                <span className="flex-1 text-left">{col.name}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Assign */}
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <UserPlus2 className="h-4 w-4" />
            Giao việc
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" showArrow={false} align="start">
          {available.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Đã giao hết thành viên</p>
          )}
          <div className="max-h-60 overflow-y-auto">
            {available.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() =>
                  addAssignee.mutate({ userId: m.userId, displayName: m.displayName, avatarUrl: m.avatarUrl })
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Avatar
                  src={m.avatarUrl ?? undefined}
                  alt={m.displayName}
                  fallback={m.displayName.charAt(0).toUpperCase()}
                  className="h-5 w-5 text-[9px]"
                />
                {m.displayName}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />
    </div>
  );
}
