'use client';

import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Text } from '@/components/ui/typography/Typography';
import { useBoard } from '../../hooks/useBoard';
import { useMembers } from '../../hooks/useMembers';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { computeBoardProgress } from '../../lib/board-progress';
import type { Project } from '../../types';

function statusOf(open: number, total: number): { label: string; variant: 'soft-primary' | 'soft-success' | 'outline' } {
  if (total === 0) return { label: 'Chưa bắt đầu', variant: 'outline' };
  if (open === 0) return { label: 'Hoàn thành', variant: 'soft-success' };
  return { label: 'Đang làm', variant: 'soft-primary' };
}

export function ProjectTableRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data: board, isLoading } = useBoard(project.id);
  const { data: members = [] } = useMembers(project.id);

  const stats = computeBoardProgress(board);
  const status = statusOf(stats.open, stats.total);
  const visible = members.slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => setSelected(project.id)}
      className="grid grid-cols-[2fr_1.3fr_90px_130px_120px] items-center gap-4 border-b border-border px-6 py-4 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <Text weight="medium" truncate>{project.name}</Text>
      </span>
      <span className="flex items-center gap-2">
        <Progress value={stats.pct} size="sm" variant="gradient" className="max-w-[160px]" />
        <Text size="xs" color="muted" numeric>{isLoading ? '…' : `${stats.pct}%`}</Text>
      </span>
      <Text size="sm" weight="medium">{isLoading ? '…' : stats.open}</Text>
      <span className="flex -space-x-2">
        {visible.map((m) => (
          <Avatar key={m.userId} src={m.avatarUrl ?? undefined} fallback={m.displayName.charAt(0).toUpperCase()} size="sm" className="border-2 border-background" />
        ))}
      </span>
      <Badge variant={status.variant} size="sm" className="w-fit">{status.label}</Badge>
    </button>
  );
}
