'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { tasksApi } from '../../services/tasks.api';
import { taskKeys } from '../../services/keys';
import { getCurrentUser } from '../../lib/current-user';
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  PROJECT_OVERDUE_META,
} from '../../constants';
import type { Project, ProjectStatus } from '../../types';

interface ProjectStatusControlProps {
  project: Project;
  className?: string;
}

/** Badge trạng thái dự án — owner đổi trực tiếp qua dropdown, member chỉ xem. */
export function ProjectStatusControl({ project, className }: ProjectStatusControlProps) {
  const qc = useQueryClient();
  const isOwner = getCurrentUser()?.userId === project.ownerId;

  const updateStatus = useMutation({
    mutationFn: (status: ProjectStatus) => tasksApi.updateProject(project.id, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.projects() });
      toast.success('Đã cập nhật trạng thái dự án');
    },
    onError: () => toast.error('Cập nhật trạng thái thất bại, thử lại sau'),
  });

  const statusMeta = project.isOverdue
    ? PROJECT_OVERDUE_META
    : PROJECT_STATUS_META[project.status];

  if (!isOwner) {
    return (
      <Badge variant={statusMeta.variant} size="sm" className={className}>
        {statusMeta.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={className ? `gap-1 px-1.5 ${className}` : 'gap-1 px-1.5'}
            disabled={updateStatus.isPending}
            aria-label="Đổi trạng thái dự án"
          >
            <Badge variant={statusMeta.variant} size="sm">
              {statusMeta.label}
            </Badge>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {PROJECT_STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => {
              if (s !== project.status) updateStatus.mutate(s);
            }}
          >
            <Badge variant={PROJECT_STATUS_META[s].variant} size="sm">
              {PROJECT_STATUS_META[s].label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
