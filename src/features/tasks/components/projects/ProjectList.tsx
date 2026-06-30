'use client';

import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Text } from '@/components/ui/typography/Typography';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { Project } from '../../types';
import {
  ProjectNameCell,
  ProjectProgressCell,
  ProjectOpenCell,
  ProjectMembersCell,
  ProjectStatusCell,
} from './ProjectCells';

const GRID = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_72px_120px_120px] items-center gap-4';

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  isError: boolean;
}

function ProjectRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);

  return (
    <button
      type="button"
      onClick={() => setSelected(project.id)}
      className={`${GRID} w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent`}
    >
      <ProjectNameCell project={project} />
      <ProjectProgressCell project={project} />
      <ProjectOpenCell project={project} />
      <ProjectMembersCell project={project} />
      <ProjectStatusCell project={project} />
    </button>
  );
}

function ListHeader() {
  return (
    <div className={`${GRID} px-4 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground`}>
      <span>Tên dự án</span>
      <span>Tiến độ</span>
      <span>Việc mở</span>
      <span>Thành viên</span>
      <span>Trạng thái</span>
    </div>
  );
}

export function ProjectList({ projects, isLoading, isError }: ProjectListProps) {
  if (isError) {
    return (
      <div className="rounded-2xl bg-muted/30 px-6 py-12 text-center">
        <Text size="sm" color="muted">Không tải được danh sách dự án.</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Đang tải danh sách dự án" className="rounded-2xl bg-muted/30 p-2">
        <ListHeader />
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${GRID} px-4 py-3`}>
              <span className="flex items-center gap-3">
                <Skeleton className="h-10 w-10" rounded="lg" />
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-2 w-full max-w-[160px]" rounded="full" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-7 w-20" rounded="full" />
              <Skeleton className="h-5 w-20" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/30 px-6 py-16 text-center">
        <Text size="sm" color="muted">Chưa có dự án. Bấm &quot;Dự án mới&quot; để tạo.</Text>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted/30 p-2">
      <ListHeader />
      <div className="space-y-1">
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
