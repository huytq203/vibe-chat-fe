'use client';

import { Progress } from '@/components/ui/progress/Progress';
import { useBoard } from '../../hooks/useBoard';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { computeBoardProgress } from '../../lib/board-progress';
import type { Project } from '../../types';

export function DashboardProjectRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data: board, isLoading } = useBoard(project.id);
  const stats = computeBoardProgress(board);

  return (
    <button
      type="button"
      onClick={() => setSelected(project.id)}
      aria-label={project.name}
      className="flex w-full flex-col gap-1.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {project.name}
        </span>
        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
          {isLoading ? '…' : `${stats.pct}%`}
        </span>
      </span>
      <span className="flex items-center gap-2 pl-8">
        <Progress value={stats.pct} size="sm" variant="gradient" className="flex-1" />
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {isLoading ? '…' : `${stats.open} mở`}
        </span>
      </span>
    </button>
  );
}
