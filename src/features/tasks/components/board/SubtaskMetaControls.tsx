'use client';

import { Calendar, Check, CheckCircle2, CircleDashed, Eye, Flag, RotateCcw, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { AssigneesControl, LabelsControl, StatusSelect } from './subtask-controls';
import type { SubtaskNode, SubtaskPatch } from '../../stores/subtasks.store';
import type { TaskPriority } from '../../types';

// Copy style từ TaskDetailSidebar (PRIORITY_META) để UI subtask đồng nhất với task cha.
const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; active: string }> = {
  P1: { label: 'Cao', dot: '#EF4444', active: 'bg-red-100 text-red-700' },
  P2: { label: 'Trung bình', dot: '#F59E0B', active: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'Thấp', dot: '#22C55E', active: 'bg-green-100 text-green-700' },
};

/** Section trong sidebar — copy styling từ TaskDetailSidebar để đồng nhất với task cha. */
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

interface SubtaskSidebarProps {
  projectId: string;
  node: SubtaskNode;
  onPatch: (patch: SubtaskPatch) => void;
}

/**
 * Sidebar phải của modal chi tiết subtask — bố cục/section giống TaskDetailSidebar
 * của task cha. Subtask vẫn là feature local demo (Zustand, chưa có BE API) nên
 * mọi thay đổi chỉ patch vào subtasks.store.
 */
export function SubtaskSidebar({ projectId, node, onPatch }: SubtaskSidebarProps) {
  const isDone = node.done ?? false;

  const handleDueDateChange = (value: Date | import('react-day-picker').DateRange | undefined) => {
    const date = value instanceof Date ? value : undefined;
    onPatch({ dueDate: date ? date.toISOString() : null });
  };

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-muted/30">
      {/* Hoàn thành / Mở lại — pattern giống task cha: chưa done → nút primary, done → trạng thái xanh */}
      <div className="border-b border-border px-4 py-3">
        {isDone ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành
            </span>
            <button
              type="button"
              onClick={() => onPatch({ done: false })}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Mở lại
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPatch({ done: true })}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Check className="h-4 w-4" /> Hoàn thành
          </button>
        )}
      </div>

      {/* Trạng thái (cột board) */}
      <SidebarSection icon={<CircleDashed className="h-4 w-4" />} title="Trạng thái">
        <StatusSelect
          projectId={projectId}
          status={node.status}
          onChange={(status) => onPatch({ status })}
        />
      </SidebarSection>

      {/* Ngày hết hạn */}
      <SidebarSection icon={<Calendar className="h-4 w-4" />} title="Ngày hết hạn">
        <DatePicker
          mode="single"
          value={node.dueDate ? new Date(node.dueDate) : undefined}
          onChange={handleDueDateChange}
          placeholder="Chưa lên lịch"
        />
      </SidebarSection>

      {/* Mức độ ưu tiên — reuse style pill của task cha */}
      <SidebarSection icon={<Flag className="h-4 w-4" />} title="Mức độ ưu tiên">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            const active = node.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPatch({ priority: active ? null : p })}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  active ? meta.active : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: meta.dot }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* Người thực hiện — local: chỉ lưu userId trong store */}
      <SidebarSection icon={<Eye className="h-4 w-4" />} title="Người thực hiện">
        <AssigneesControl
          projectId={projectId}
          assigneeIds={node.assigneeIds}
          onChange={(assigneeIds) => onPatch({ assigneeIds })}
        />
      </SidebarSection>

      {/* Nhãn — local: chỉ lưu tagId trong store */}
      <SidebarSection icon={<TagIcon className="h-4 w-4" />} title="Nhãn">
        <LabelsControl
          projectId={projectId}
          tagIds={node.tagIds}
          onChange={(tagIds) => onPatch({ tagIds })}
        />
      </SidebarSection>

      {/* Metadata footer — subtask local chỉ có id */}
      <div className="space-y-2 px-4 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground/70">Subtask ID</span>
          <span className="truncate font-mono">{node.id}</span>
        </div>
      </div>
    </div>
  );
}
