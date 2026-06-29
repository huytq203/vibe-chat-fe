'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Calendar, Flag, UserPlus, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar/Calendar';
import { useTaskDetail, useUpdateTask } from '../hooks/useTaskDetail';
import { TaskDetailLeftPanel } from './TaskDetailLeftPanel';
import { useAssignees, useAddAssignee, useRemoveAssignee } from '../hooks/useAssignees';
import { useTaskTags, useProjectTags, useAttachTag, useDetachTag } from '../hooks/useTaskTags';
import { useMembers } from '../hooks/useMembers';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import type { TaskPriority } from '../types';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P1: '🔴 P1 - Khẩn cấp',
  P2: '🟡 P2 - Trung bình',
  P3: '🟢 P3 - Thấp',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-green-100 text-green-700',
};

interface TaskDetailModalProps {
  projectId: string;
}

export function TaskDetailModal({ projectId }: TaskDetailModalProps) {
  const selectedTaskId = useTasksUIStore((s) => s.selectedTaskId);
  const closeTask = useTasksUIStore((s) => s.closeTask);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { data: task } = useTaskDetail(projectId, selectedTaskId);
  const { data: assignees = [] } = useAssignees(projectId, selectedTaskId);
  const { data: taskTags = [] } = useTaskTags(projectId, selectedTaskId);
  const { data: projectTags = [] } = useProjectTags(projectId);
  const { data: members = [] } = useMembers(projectId);
  const updateTask = useUpdateTask(projectId, selectedTaskId ?? '');
  const addAssignee = useAddAssignee(projectId, selectedTaskId ?? '');
  const removeAssignee = useRemoveAssignee(projectId, selectedTaskId ?? '');
  const attachTag = useAttachTag(projectId, selectedTaskId ?? '');
  const detachTag = useDetachTag(projectId, selectedTaskId ?? '');

  const open = !!selectedTaskId;

  const handleTitleSave = () => {
    if (!titleDraft.trim() || !task) return;
    updateTask.mutate({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const handlePriorityChange = (p: TaskPriority | null) => {
    updateTask.mutate({ priority: p });
  };

  // Calendar onSelect returns Date | DateRange | Date[] | undefined; extract Date for single mode
  const handleDueDateSelect = (value: Date | import('react-day-picker').DateRange | Date[] | undefined) => {
    const date = value instanceof Date ? value : undefined;
    updateTask.mutate({ dueDate: date ? date.toISOString() : null });
  };

  const availableToAssign = members.filter(
    (m) => !assignees.some((a) => a.userId === m.userId),
  );

  const unattachedTags = projectTags.filter(
    (pt) => !taskTags.some((tt) => tt.id === pt.id),
  );

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeTask()}>
      <DialogContent className="flex h-[80vh] max-w-[820px] gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{task.title}</DialogTitle>

        {/* Left panel — Task 5 fills this */}
        <div className="flex flex-1 flex-col overflow-hidden p-6">
          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              className="mb-4 w-full rounded border border-primary bg-background px-2 py-1 text-xl font-semibold outline-none"
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
              className="mb-4 cursor-pointer text-xl font-semibold hover:text-primary"
              onClick={() => {
                setTitleDraft(task.title);
                setEditingTitle(true);
              }}
            >
              {task.title}
            </h2>
          )}
          {task.priority && (
            <Badge className={`mb-3 w-fit text-xs ${PRIORITY_COLORS[task.priority]}`}>
              <Flag className="mr-1 h-3 w-3" />
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          )}
          {selectedTaskId && (
            <TaskDetailLeftPanel projectId={projectId} taskId={selectedTaskId} />
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-muted/30 p-4">
          {/* Priority */}
          <section>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Mức độ ưu tiên</p>
            <div className="flex flex-wrap gap-1">
              {(['P1', 'P2', 'P3'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePriorityChange(task.priority === p ? null : p)}
                  className={`rounded px-2 py-0.5 text-xs ${
                    task.priority === p
                      ? PRIORITY_COLORS[p]
                      : 'bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
              {task.priority && (
                <button
                  type="button"
                  onClick={() => handlePriorityChange(null)}
                  className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </section>

          {/* Due date */}
          <section>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Ngày hết hạn</p>
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  size="xs"
                  className="h-7 w-full justify-start text-xs"
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('vi-VN')
                    : 'Chọn ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" showArrow={false} align="start">
                <CalendarPicker
                  mode="single"
                  selected={task.dueDate ? new Date(task.dueDate) : undefined}
                  onSelect={handleDueDateSelect}
                />
                {task.dueDate && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="w-full text-xs"
                      onClick={() => updateTask.mutate({ dueDate: null })}
                    >
                      Xóa ngày
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </section>

          {/* Assignees */}
          <section>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Người thực hiện</p>
            <div className="flex flex-wrap gap-1">
              {assignees.map((a) => (
                <div
                  key={a.userId}
                  className="flex items-center gap-1 rounded bg-background px-1.5 py-0.5"
                >
                  <Avatar
                    src={a.avatarUrl ?? undefined}
                    alt={a.displayName}
                    fallback={a.displayName.charAt(0).toUpperCase()}
                    className="h-4 w-4 text-[8px]"
                  />
                  <span className="text-xs">{a.displayName}</span>
                  <button
                    type="button"
                    onClick={() => removeAssignee.mutate(a.userId)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {availableToAssign.length > 0 && (
              <Popover>
                <PopoverTrigger>
                  <Button variant="ghost" size="xs" className="mt-1 h-6 px-1 text-xs">
                    <UserPlus className="mr-1 h-3 w-3" /> Thêm
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" showArrow={false} align="start">
                  {availableToAssign.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => addAssignee.mutate({ userId: m.userId, displayName: m.displayName, avatarUrl: m.avatarUrl })}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
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
                </PopoverContent>
              </Popover>
            )}
          </section>

          {/* Tags */}
          <section>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Nhãn</p>
            <div className="flex flex-wrap gap-1">
              {taskTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => detachTag.mutate(tag.id)}
                  className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <X className="h-2.5 w-2.5" />
                </button>
              ))}
              {unattachedTags.length > 0 && (
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="xs" className="h-5 px-1 text-xs">
                      + Nhãn
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" showArrow={false} align="start">
                    {unattachedTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => attachTag.mutate(tag.id)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
