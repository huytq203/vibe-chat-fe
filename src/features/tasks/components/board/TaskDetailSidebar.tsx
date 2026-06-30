'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Calendar, Eye, Flag, Hash, Tag as TagIcon, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { useUpdateTask } from '../../hooks/useTaskDetail';
import { useAssignees } from '../../hooks/useAssignees';
import { useTaskTags, useProjectTags } from '../../hooks/useTaskTags';
import { useMembers } from '../../hooks/useMembers';
import type { Member, Tag, TaskDetail, TaskPriority } from '../../types';

const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; active: string }> = {
  P1: { label: 'Cao', dot: '#EF4444', active: 'bg-red-100 text-red-700' },
  P2: { label: 'Trung bình', dot: '#F59E0B', active: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'Thấp', dot: '#22C55E', active: 'bg-green-100 text-green-700' },
};

function SidebarSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

interface TaskDetailSidebarProps {
  projectId: string;
  taskId: string;
  task: TaskDetail;
}

export function TaskDetailSidebar({ projectId, taskId, task }: TaskDetailSidebarProps) {
  const updateTask = useUpdateTask(projectId, taskId);
  const { data: serverAssignees } = useAssignees(projectId, taskId);
  const { data: serverTaskTags } = useTaskTags(projectId, taskId);
  const { data: projectTags = [] } = useProjectTags(projectId);
  const { data: members = [] } = useMembers(projectId);

  // Demo UI: quản lý nhãn & người thực hiện bằng local state (chưa nối API).
  // Seed từ server khi data đổi — điều chỉnh state ngay trong render (pattern React),
  // tránh useEffect + setState. Thao tác thêm/xoá chỉ đổi local nên hiện ngay.
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsSeed, setTagsSeed] = useState<Tag[] | undefined>(undefined);
  if (serverTaskTags !== tagsSeed) {
    setTagsSeed(serverTaskTags);
    if (serverTaskTags) setTags(serverTaskTags);
  }

  const [assignees, setAssignees] = useState<Member[]>([]);
  const [assigneesSeed, setAssigneesSeed] = useState<Member[] | undefined>(undefined);
  if (serverAssignees !== assigneesSeed) {
    setAssigneesSeed(serverAssignees);
    if (serverAssignees) setAssignees(serverAssignees);
  }

  const availableMembers = members.filter((m) => !assignees.some((a) => a.userId === m.userId));
  const availableTags = projectTags.filter((pt) => !tags.some((t) => t.id === pt.id));

  const handleDueDateChange = (value: Date | import('react-day-picker').DateRange | undefined) => {
    const date = value instanceof Date ? value : undefined;
    updateTask.mutate({ dueDate: date ? date.toISOString() : null });
  };

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-muted/30">
      {/* Due date */}
      <SidebarSection icon={<Calendar className="h-4 w-4" />} title="Ngày hết hạn">
        <DatePicker
          mode="single"
          value={task.dueDate ? new Date(task.dueDate) : undefined}
          onChange={handleDueDateChange}
          placeholder="Chưa lên lịch"
        />
      </SidebarSection>

      {/* Priority */}
      <SidebarSection icon={<Flag className="h-4 w-4" />} title="Mức độ ưu tiên">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            const active = task.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => updateTask.mutate({ priority: active ? null : p })}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  active ? meta.active : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* Assignees */}
      <SidebarSection icon={<Eye className="h-4 w-4" />} title="Người thực hiện">
        <div className="flex flex-wrap items-center gap-1.5">
          {assignees.map((a) => (
            <span key={a.userId} className="flex items-center gap-1 rounded-full bg-background py-0.5 pl-0.5 pr-1.5">
              <Avatar
                src={a.avatarUrl ?? undefined}
                alt={a.displayName}
                fallback={a.displayName.charAt(0).toUpperCase()}
                className="h-5 w-5 text-[9px]"
              />
              <span className="text-xs">{a.displayName}</span>
              <button
                type="button"
                onClick={() => setAssignees((prev) => prev.filter((x) => x.userId !== a.userId))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Bỏ ${a.displayName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {availableMembers.length > 0 && (
            <Popover>
              <PopoverTrigger>
                <Button variant="ghost" size="xs" className="h-7 px-1.5 text-xs">
                  <UserPlus className="mr-1 h-3.5 w-3.5" /> Thêm
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" showArrow={false} align="start">
                <div className="max-h-60 overflow-y-auto">
                  {availableMembers.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => setAssignees((prev) => [...prev, m])}
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
          )}
          {assignees.length === 0 && availableMembers.length === 0 && (
            <span className="text-xs text-muted-foreground">Chưa có thành viên</span>
          )}
        </div>
      </SidebarSection>

      {/* Tags */}
      <SidebarSection icon={<TagIcon className="h-4 w-4" />} title="Nhãn">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((t) => t.id !== tag.id))}
                aria-label={`Xoá nhãn ${tag.name}`}
                className="hover:opacity-80"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {availableTags.length > 0 && (
            <Popover>
              <PopoverTrigger>
                <Button variant="ghost" size="xs" className="h-7 px-1.5 text-xs">
                  <TagIcon className="mr-1 h-3.5 w-3.5" /> Nhãn
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-2" showArrow={false} align="start">
                <div className="max-h-60 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setTags((prev) => [...prev, tag])}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {tags.length === 0 && availableTags.length === 0 && (
            <span className="text-xs text-muted-foreground">Chưa có nhãn</span>
          )}
        </div>
      </SidebarSection>

      {/* Metadata footer */}
      <div className="space-y-2 px-4 py-4 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/70">Tạo lúc</span>
          <p className="mt-0.5">{new Date(task.createdAt).toLocaleString('vi-VN')}</p>
        </div>
        <div>
          <span className="font-medium text-foreground/70">Cập nhật</span>
          <p className="mt-0.5">{new Date(task.updatedAt).toLocaleString('vi-VN')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground/70">Task ID</span>
          <span className="truncate font-mono">{task.id}</span>
        </div>
      </div>
    </div>
  );
}
