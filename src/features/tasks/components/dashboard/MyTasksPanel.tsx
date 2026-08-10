'use client';

import { cn } from '@/lib/utils/cn';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { useMyTaskBuckets, type MyTaskBucket } from '../../hooks/useMyTaskBuckets';
import { PRIORITY_CONFIG, formatDueDate } from '../board/TaskCard';
import { Panel, PanelState } from '../common';
import type { MyTask } from '../../types';

const BUCKET_TONE: Record<MyTaskBucket['id'], string> = {
  overdue: 'text-danger',
  today: 'text-foreground',
  upcoming: 'text-muted-foreground',
  someday: 'text-muted-foreground',
};

function TaskRow({ task, isOverdue }: { task: MyTask; isOverdue: boolean }) {
  // setSelectedProjectId đồng thời chuyển activeView sang 'board' (xem tasks-ui.store)
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <button
      type="button"
      onClick={() => setSelectedProjectId(task.projectId)}
      aria-label={task.title}
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: priority?.dot ?? 'var(--muted-foreground)' }}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {task.title}
      </span>
      <span className="hidden max-w-[120px] shrink-0 truncate text-[11.5px] text-muted-foreground sm:block">
        {task.projectName}
      </span>
      {due && (
        <span
          className={cn(
            'shrink-0 text-[11.5px] tabular-nums',
            isOverdue ? 'font-semibold text-danger' : 'text-muted-foreground',
          )}
        >
          {due.label}
        </span>
      )}
    </button>
  );
}

interface MyTasksPanelProps {
  tasks: MyTask[] | undefined;
  isPending: boolean;
  isError: boolean;
}

export function MyTasksPanel({ tasks, isPending, isError }: MyTasksPanelProps) {
  const { buckets } = useMyTaskBuckets(tasks);
  const total = tasks?.length ?? 0;

  return (
    <Panel
      title="Việc của bạn"
      action={
        total > 0 && (
          <span className="text-[11.5px] tabular-nums text-muted-foreground">{total}</span>
        )
      }
      bodyClassName="max-h-[420px] overflow-y-auto pr-0.5"
    >
      {isPending && <PanelState>Đang tải nhiệm vụ…</PanelState>}
      {isError && <PanelState tone="danger">Không tải được danh sách nhiệm vụ.</PanelState>}
      {!isPending && !isError && total === 0 && (
        <PanelState>Chưa có nhiệm vụ nào được giao cho bạn.</PanelState>
      )}

      {buckets.map((bucket) => (
        <section key={bucket.id} className="pb-1.5 last:pb-0">
          <h3
            className={cn(
              'flex items-baseline gap-2 px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider',
              BUCKET_TONE[bucket.id],
            )}
          >
            {bucket.label}
            <span className="tabular-nums opacity-60">{bucket.tasks.length}</span>
          </h3>
          {bucket.tasks.map((task) => (
            <TaskRow key={task.id} task={task} isOverdue={bucket.id === 'overdue'} />
          ))}
        </section>
      ))}
    </Panel>
  );
}
