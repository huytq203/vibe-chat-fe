'use client';

import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Text } from '@/components/ui/typography/Typography';
import { useBoard } from '../../hooks/useBoard';
import { useMembers } from '../../hooks/useMembers';
import { computeBoardProgress } from '../../lib/board-progress';
import type { Project } from '../../types';

interface ProjectCellProps {
  project: Project;
}

type StatusVariant = 'soft-primary' | 'soft-success' | 'outline';

function statusOf(open: number, total: number): { label: string; variant: StatusVariant } {
  if (total === 0) return { label: 'Chưa bắt đầu', variant: 'outline' };
  if (open === 0) return { label: 'Hoàn thành', variant: 'soft-success' };
  return { label: 'Đang làm', variant: 'soft-primary' };
}

export function ProjectNameCell({ project }: ProjectCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
        {project.name.charAt(0).toUpperCase()}
      </span>
      <Text weight="medium" truncate>{project.name}</Text>
    </span>
  );
}

export function ProjectProgressCell({ project }: ProjectCellProps) {
  const { data: board, isLoading } = useBoard(project.id);
  const stats = computeBoardProgress(board);

  return (
    <span className="flex items-center gap-2">
      <Progress value={stats.pct} size="sm" variant="gradient" className="max-w-[160px]" />
      <Text size="xs" color="muted" numeric>{isLoading ? '…' : `${stats.pct}%`}</Text>
    </span>
  );
}

export function ProjectOpenCell({ project }: ProjectCellProps) {
  const { data: board, isLoading } = useBoard(project.id);
  const stats = computeBoardProgress(board);

  return <Text size="sm" weight="medium">{isLoading ? '…' : stats.open}</Text>;
}

export function ProjectMembersCell({ project }: ProjectCellProps) {
  const { data: members = [] } = useMembers(project.id);
  const visible = members.slice(0, 4);

  return (
    <span className="flex -space-x-2">
      {visible.map((m) => (
        <Avatar
          key={m.userId}
          src={m.avatarUrl ?? undefined}
          fallback={m.displayName.charAt(0).toUpperCase()}
          size="sm"
          className="border-2 border-background"
        />
      ))}
    </span>
  );
}

export function ProjectStatusCell({ project }: ProjectCellProps) {
  const { data: board } = useBoard(project.id);
  const stats = computeBoardProgress(board);
  const status = statusOf(stats.open, stats.total);

  return <Badge variant={status.variant} size="sm" className="w-fit">{status.label}</Badge>;
}
