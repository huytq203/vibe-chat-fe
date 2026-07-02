'use client';

import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Text } from '@/components/ui/typography/Typography';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import type { Project } from '../../types';
import {
  ProjectNameCell,
  ProjectProgressCell,
  ProjectOpenCell,
  ProjectMembersCell,
  ProjectStatusCell,
} from './ProjectCells';

const GRID = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_72px_120px_120px] items-center gap-4';

// Cao ~5 dòng — mặc định thấy 5 dự án, cuộn trong khung để lazy load thêm.
const SCROLL_MAX_H = 'max-h-[340px]';

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  isError: boolean;
  isSearching?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
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

export function ProjectList({
  projects,
  isLoading,
  isError,
  isSearching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ProjectListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  });

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
        <Text size="sm" color="muted">
          {isSearching
            ? 'Không tìm thấy dự án khớp từ khoá.'
            : 'Chưa có dự án. Bấm "Dự án mới" để tạo.'}
        </Text>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted/30 p-2">
      <ListHeader />
      <div ref={scrollRef} className={`${SCROLL_MAX_H} space-y-1 overflow-y-auto`}>
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
        {hasNextPage && (
          <div ref={sentinelRef} className="py-2 text-center">
            {isFetchingNextPage && (
              <Text size="xs" color="muted">
                Đang tải thêm…
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
