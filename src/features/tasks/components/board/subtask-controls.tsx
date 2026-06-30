'use client';

import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox/ComboBox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { Tag as TagIcon, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProjectTags } from '../../hooks/useTaskTags';
import { useMembers } from '../../hooks/useMembers';
import { useBoard } from '../../hooks/useBoard';
import type { TaskPriority } from '../../types';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  P1: '#EF4444',
  P2: '#F59E0B',
  P3: '#22C55E',
};

/** Trạng thái subtask = cột (BoardColumn) của board; options lấy trực tiếp từ board. */
export function StatusSelect({
  projectId,
  status,
  onChange,
}: {
  projectId: string;
  status: string;
  onChange: (status: string) => void;
}) {
  const { data: board } = useBoard(projectId);
  const options: ComboBoxOption[] = (board?.columns ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  return (
    <ComboBox
      options={options}
      className=''
      value={status}
      autocomplete={false}
      clearIcon={false}
      onValueChange={(v) => {
        const next = Array.isArray(v) ? v[0] : v;
        if (next) onChange(next); // bỏ qua giá trị rỗng để status luôn hợp lệ
      }}
    />
  );
}

export function PrioritySelect({
  priority,
  onChange,
}: {
  priority: TaskPriority | null;
  onChange: (priority: TaskPriority | null) => void;
}) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-full bg-background px-1.5 py-0.5">
      {(Object.keys(PRIORITY_DOT) as TaskPriority[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(priority === p ? null : p)}
          aria-label={`Ưu tiên ${p}`}
          title={p}
          className={cn(
            'h-4 w-4 rounded-full transition-transform hover:scale-110',
            priority === p ? 'ring-2 ring-offset-1' : 'opacity-40',
          )}
          style={{ backgroundColor: PRIORITY_DOT[p] }}
        />
      ))}
    </div>
  );
}

export function LabelsControl({
  projectId,
  tagIds,
  onChange,
}: {
  projectId: string;
  tagIds: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const { data: projectTags = [] } = useProjectTags(projectId);
  const tags = projectTags.filter((t) => tagIds.includes(t.id));
  const available = projectTags.filter((t) => !tagIds.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: t.color }}
        >
          {t.name}
          <button
            type="button"
            aria-label={`Bỏ nhãn ${t.name}`}
            onClick={() => onChange(tagIds.filter((id) => id !== t.id))}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" size="xs" className="h-7 px-1.5 text-xs">
              <TagIcon className="mr-1 h-3.5 w-3.5" /> Nhãn
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" showArrow={false} align="start">
            <div className="max-h-52 overflow-y-auto">
              {available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange([...tagIds, t.id])}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {tags.length === 0 && available.length === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function AssigneesControl({
  projectId,
  assigneeIds,
  onChange,
}: {
  projectId: string;
  assigneeIds: string[];
  onChange: (assigneeIds: string[]) => void;
}) {
  const { data: members = [] } = useMembers(projectId);
  const assignees = members.filter((m) => assigneeIds.includes(m.userId));
  const available = members.filter((m) => !assigneeIds.includes(m.userId));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assignees.map((a) => (
        <span key={a.userId} className="flex items-center gap-1 rounded-full bg-background py-0.5 pl-0.5 pr-1.5">
          <Avatar
            src={a.avatarUrl ?? undefined}
            alt={a.displayName}
            fallback={a.displayName.charAt(0).toUpperCase()}
            className="h-5 w-5 text-[9px]"
          />
          <span className="text-[11px]">{a.displayName}</span>
          <button
            type="button"
            aria-label={`Bỏ ${a.displayName}`}
            onClick={() => onChange(assigneeIds.filter((id) => id !== a.userId))}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" size="xs" className="h-7 px-1.5 text-xs">
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Giao
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" showArrow={false} align="start">
            <div className="max-h-52 overflow-y-auto">
              {available.map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => onChange([...assigneeIds, m.userId])}
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
      {assignees.length === 0 && available.length === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
