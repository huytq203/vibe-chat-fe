'use client';

import { useRef } from 'react';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { Panel, PanelState } from '../common';
import { DashboardProjectRow } from './DashboardProjectRow';
import type { Project } from '../../types';

interface ProjectsPanelProps {
  projects: Project[];
  isLoading: boolean;
  isError: boolean;
  isSearching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function ProjectsPanel({
  projects,
  isLoading,
  isError,
  isSearching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ProjectsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  });

  return (
    <Panel
      title="Dự án"
      action={
        projects.length > 0 && (
          <span className="text-[11.5px] tabular-nums text-muted-foreground">{projects.length}</span>
        )
      }
    >
      {isLoading && <PanelState>Đang tải dự án…</PanelState>}
      {isError && <PanelState tone="danger">Không tải được danh sách dự án.</PanelState>}
      {!isLoading && !isError && projects.length === 0 && (
        <PanelState>
          {isSearching
            ? 'Không tìm thấy dự án khớp từ khoá.'
            : 'Chưa có dự án. Bấm "Tạo mới" để bắt đầu.'}
        </PanelState>
      )}

      {/* Khung ~4 dòng: cuộn trong panel để lazy load thêm, không kéo dài cả trang */}
      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto pr-0.5">
        {projects.map((project) => (
          <DashboardProjectRow key={project.id} project={project} />
        ))}
        {hasNextPage && (
          <div ref={sentinelRef} className="py-2 text-center">
            {isFetchingNextPage && (
              <span className="text-[11.5px] text-muted-foreground">Đang tải thêm…</span>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
