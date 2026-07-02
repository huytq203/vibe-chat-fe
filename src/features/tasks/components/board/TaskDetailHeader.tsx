'use client';

import { useState } from 'react';
import {
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pin,
  RotateCcw,
  UserPlus2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { useBoard } from '../../hooks/useBoard';
import { useMoveTask } from '../../hooks/useMoveTask';
import { useMembers } from '../../hooks/useMembers';
import { useAssignees, useAddAssignee } from '../../hooks/useAssignees';
import {
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useArchiveTask,
} from '../../hooks/useTaskDetail';
import { getCurrentUser } from '../../lib/current-user';
import { TaskDetailMenu } from './TaskDetailMenu';
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
  const updateTask = useUpdateTask(projectId, taskId);

  // Workflow complete → review → done → archive.
  const completeTask = useCompleteTask(projectId, taskId);
  const reopenTask = useReopenTask(projectId, taskId);
  const archiveTask = useArchiveTask(projectId, taskId);
  const workflowPending =
    completeTask.isPending || reopenTask.isPending || archiveTask.isPending;

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  // Owner = chủ dự án; chỉ owner mới duyệt/lưu trữ. reviewRequester = người đã gửi yêu cầu duyệt.
  const currentUser = getCurrentUser();
  const isOwner = !!board && !!currentUser && board.project.ownerId === currentUser.userId;
  const isReviewRequester =
    !!currentUser && task.reviewRequestedBy === currentUser.userId;

  const columns = board?.columns ?? [];
  const currentColumn = columns.find((c) => c.id === task.columnId);

  const handleMove = (col: BoardColumn) => {
    if (col.id === task.columnId) return;
    const last = col.tasks[col.tasks.length - 1];
    moveTask.mutate({ taskId, columnId: col.id, position: (last?.position ?? 0) + 1000 });
  };

  const available = members.filter((m) => !assignees.some((a) => a.userId === m.userId));

  const confirmArchive = () => {
    archiveTask.mutate(undefined, { onSuccess: () => setArchiveConfirmOpen(false) });
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border py-0 pl-5 pr-12">
        {/* Workflow: hoàn thành / duyệt / lưu trữ — hook ghi thẳng status trả về nên UI phản hồi ngay */}
        {task.status === 'OPEN' && (
          <button
            type="button"
            disabled={workflowPending}
            onClick={() => completeTask.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Hoàn thành
          </button>
        )}

        {task.status === 'IN_REVIEW' && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-500">
              <Clock className="h-4 w-4" />
              Chờ duyệt
            </span>
            {isOwner && (
              <>
                <button
                  type="button"
                  disabled={workflowPending}
                  onClick={() => completeTask.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Duyệt hoàn thành
                </button>
                <button
                  type="button"
                  disabled={workflowPending}
                  onClick={() => reopenTask.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Trả lại
                </button>
              </>
            )}
            {!isOwner && isReviewRequester && (
              <button
                type="button"
                disabled={workflowPending}
                onClick={() => reopenTask.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Hủy yêu cầu
              </button>
            )}
          </div>
        )}

        {/* DONE: thời gian hoàn thành hiển thị ở body (sidebar). Header chỉ có action cho owner. */}
        {task.status === 'DONE' && isOwner && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={workflowPending}
              onClick={() => setArchiveConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Archive className="h-4 w-4" />
              Lưu trữ
            </button>
            <button
              type="button"
              disabled={workflowPending}
              onClick={() => reopenTask.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Mở lại
            </button>
          </div>
        )}

        {task.status === 'ARCHIVED' && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground">
              <Archive className="h-4 w-4" />
              Đã lưu trữ
            </span>
            {isOwner && (
              <button
                type="button"
                disabled={workflowPending}
                onClick={() => reopenTask.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Mở lại
              </button>
            )}
          </div>
        )}

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
                    addAssignee.mutate({
                      userId: m.userId,
                      displayName: m.displayName,
                      avatarUrl: m.avatarUrl,
                    })
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

        {/* Pin */}
        <button
          type="button"
          aria-label={task.isPinned ? 'Bỏ ghim' : 'Ghim nhiệm vụ'}
          aria-pressed={task.isPinned}
          onClick={() => updateTask.mutate({ isPinned: !task.isPinned })}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted',
            task.isPinned ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Pin className={cn('h-4 w-4', task.isPinned && 'fill-current')} />
        </button>

        {/* More */}
        <TaskDetailMenu projectId={projectId} taskId={taskId} taskTitle={task.title} />
      </div>

      {/* Xác nhận lưu trữ — task sẽ bị clear khỏi board */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ nhiệm vụ?</AlertDialogTitle>
            <AlertDialogDescription>
              Nhiệm vụ <span className="font-semibold text-foreground">{task.title}</span> sẽ được
              ẩn khỏi board. Bạn có thể mở lại sau nếu cần.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setArchiveConfirmOpen(false)}
              disabled={archiveTask.isPending}
            >
              Huỷ
            </Button>
            <Button onClick={confirmArchive} isLoading={archiveTask.isPending}>
              Lưu trữ
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
