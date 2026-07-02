'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { cn } from '@/lib/utils/cn';
import { useTaskDetail, useUpdateTask } from '../../hooks/useTaskDetail';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailLeftPanel } from './TaskDetailLeftPanel';
import { TaskDetailSidebar } from './TaskDetailSidebar';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { SubtaskDetailView } from './SubtaskDetailView';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { EMPTY_SUBTASKS, findNode, useSubtasksStore } from '../../stores/subtasks.store';
import type { TaskPriority } from '../../types';

const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  P1: { label: 'Ưu tiên cao', cls: 'bg-red-100 text-red-700' },
  P2: { label: 'Ưu tiên trung bình', cls: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'Ưu tiên thấp', cls: 'bg-green-100 text-green-700' },
};

export function TaskDetailModal({ projectId }: { projectId: string }) {
  const selectedTaskId = useTasksUIStore((s) => s.selectedTaskId);
  const closeTask = useTasksUIStore((s) => s.closeTask);
  const { data: task, isLoading } = useTaskDetail(projectId, selectedTaskId);
  const updateTask = useUpdateTask(projectId, selectedTaskId ?? '');

  const path = useSubtasksStore((s) => s.path);
  const tree =
    useSubtasksStore((s) => (selectedTaskId ? s.treesByRoot[selectedTaskId] : undefined)) ??
    EMPTY_SUBTASKS;
  const resetPath = useSubtasksStore((s) => s.resetPath);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const open = !!selectedTaskId;
  // Node subtask đang xem (nếu có) → quyết định "replace content" của modal cha.
  const activeNode = path.length > 0 ? findNode(tree, path[path.length - 1]) : null;

  const handleClose = () => {
    resetPath();
    closeTask();
  };

  const handleTitleSave = () => {
    if (titleDraft.trim()) updateTask.mutate({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="flex h-[82vh] max-w-[880px] flex-col gap-0 overflow-hidden p-0">
        {isLoading && (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Đang tải nhiệm vụ…
          </div>
        )}

        {task && selectedTaskId && (
          <>
            <DialogTitle className="sr-only">{activeNode?.title ?? task.title}</DialogTitle>

            {activeNode ? (
              <SubtaskDetailView rootId={selectedTaskId} node={activeNode} projectId={projectId} />
            ) : (
              <>
                <TaskDetailHeader projectId={projectId} taskId={selectedTaskId} task={task} />

                <div className="flex min-h-0 flex-1">
                  {/* Left: title, description, subtasks/checklist/attachments/activity */}
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
                          // Task đã hoàn thành → gạch ngang + màu mờ
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
                        key={selectedTaskId}
                        value={task.description ?? ''}
                        onSave={(html) => updateTask.mutate({ description: html || null })}
                      />
                    </div>

                    <div className="mt-1 flex-1">
                      <TaskDetailLeftPanel projectId={projectId} taskId={selectedTaskId} />
                    </div>
                  </div>

                  {/* Right sidebar */}
                  <TaskDetailSidebar projectId={projectId} taskId={selectedTaskId} task={task} />
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
