'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { cn } from '@/lib/utils/cn';
import { useTaskDetail, useUpdateTask } from '../../hooks/useTaskDetail';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailLeftPanel } from './TaskDetailLeftPanel';
import { TaskDetailSidebar } from './TaskDetailSidebar';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { TaskPriority } from '../../types';

const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  P1: { label: 'Ưu tiên cao', cls: 'bg-red-100 text-red-700' },
  P2: { label: 'Ưu tiên trung bình', cls: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'Ưu tiên thấp', cls: 'bg-green-100 text-green-700' },
};

export function TaskDetailModal({ projectId }: { projectId: string }) {
  const selectedTaskId = useTasksUIStore((s) => s.selectedTaskId);
  const subtaskPath = useTasksUIStore((s) => s.subtaskPath);
  const navigateBack = useTasksUIStore((s) => s.navigateSubtaskBack);
  const closeTask = useTasksUIStore((s) => s.closeTask);
  const qc = useQueryClient();

  // Task đang xem = subtask sâu nhất (nếu drill-down) hoặc task gốc mở từ board.
  const currentTaskId =
    subtaskPath.length > 0 ? subtaskPath[subtaskPath.length - 1] : selectedTaskId;
  const isSubtask = subtaskPath.length > 0;

  // Quay lại cha → refresh danh sách con để thấy thay đổi vừa làm trong subtask
  // (assignee/ưu tiên/nhãn/trạng thái) mà list con không tự invalidate.
  const handleBack = () => {
    const parentId =
      subtaskPath.length > 1 ? subtaskPath[subtaskPath.length - 2] : selectedTaskId;
    if (parentId) {
      void qc.invalidateQueries({
        queryKey: ['tasks', projectId, parentId, 'subtasks'],
      });
    }
    navigateBack();
  };

  const { data: task, isLoading } = useTaskDetail(projectId, currentTaskId);
  const updateTask = useUpdateTask(projectId, currentTaskId ?? '');

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const open = !!selectedTaskId;

  const handleTitleSave = () => {
    if (titleDraft.trim()) updateTask.mutate({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeTask()}>
      <DialogContent className="flex h-[82vh] max-w-[880px] flex-col gap-0 overflow-hidden p-0">
        {isLoading && (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Đang tải nhiệm vụ…
          </div>
        )}

        {task && currentTaskId && (
          <>
            <DialogTitle className="sr-only">{task.title}</DialogTitle>

            {/* Breadcrumb quay lại task cha khi đang xem subtask */}
            {isSubtask && (
              <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-4 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" /> Quay lại
                </button>
                <span>/ Task con</span>
              </div>
            )}

            <TaskDetailHeader projectId={projectId} taskId={currentTaskId} task={task} />

            <div className="flex min-h-0 flex-1">
              {/* Left: title, mô tả, subtask/checklist/attachment/comment/history */}
              <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
                {editingTitle ? (
                  <input
                    autoFocus
                    className="w-full rounded border border-primary bg-background px-2 py-1 text-2xl font-bold outline-none"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                  />
                ) : (
                  <h2
                    className={cn(
                      'cursor-text text-2xl font-bold leading-tight hover:text-primary',
                      task.completedAt && 'line-through text-muted-foreground',
                    )}
                    onClick={() => {
                      setTitleDraft(task.title);
                      setEditingTitle(true);
                    }}
                  >
                    {task.title}
                  </h2>
                )}

                {task.priority && (
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[task.priority].cls}`}
                  >
                    {PRIORITY_BADGE[task.priority].label}
                  </span>
                )}

                <div>
                  <h3 className="mb-1 text-sm font-medium">Mô tả</h3>
                  <TaskDescriptionEditor
                    key={currentTaskId}
                    value={task.description ?? ''}
                    onSave={(html) => updateTask.mutate({ description: html || null })}
                  />
                </div>

                <div className="mt-1 flex-1">
                  <TaskDetailLeftPanel projectId={projectId} taskId={currentTaskId} />
                </div>
              </div>

              {/* Right sidebar */}
              <TaskDetailSidebar projectId={projectId} taskId={currentTaskId} task={task} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
