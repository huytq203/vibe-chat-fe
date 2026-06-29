'use client';

import { ListTodo } from 'lucide-react';
import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
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
      className="grid grid-cols-[1.6fr_1fr_90px] items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ListTodo className="h-4 w-4" />
        </span>
        <Text size="sm" weight="medium" truncate>
          {project.name}
        </Text>
      </span>
      <span className="flex items-center gap-2">
        <Progress value={stats.pct} size="sm" variant="gradient" className="max-w-[140px]" />
        <Text size="xs" color="muted" numeric>
          {isLoading ? '…' : `${stats.pct}%`}
        </Text>
      </span>
      <Badge variant="outline" size="sm" className="w-fit">
        {isLoading ? '…' : `${stats.open} mở`}
      </Badge>
    </button>
  );
}
