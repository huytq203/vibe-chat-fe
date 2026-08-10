'use client';

import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useProjectsInfinite } from '../../hooks/useProjectsInfinite';
import { useMyTasks } from '../../hooks/useMyTasks';
import { useMyTaskBuckets } from '../../hooks/useMyTaskBuckets';
import { useStatsOverview } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { StatBar, type StatBarItem } from '../common';
import { HomeHero } from './HomeHero';
import { MyTasksPanel } from './MyTasksPanel';
import { ProjectsPanel } from './ProjectsPanel';
import { ActivityPanel } from './ActivityPanel';
import type { StatsOverview } from '../../types';

function buildStatItems(data: StatsOverview): StatBarItem[] {
  // "Đang làm" chỉ tồn tại ở cấp project → cộng dồn, giống cách trang Báo cáo tính.
  const inProgress = data.projects.reduce((sum, p) => sum + p.inProgressTasks, 0);
  const pct = (n: number) => (data.totalTasks > 0 ? Math.round((n / data.totalTasks) * 100) : 0);

  return [
    { label: 'Tổng việc', value: data.totalTasks, hint: `trên ${data.totalProjects} dự án` },
    {
      label: 'Hoàn thành',
      value: data.completedTasks,
      hint: `${pct(data.completedTasks)}% tổng việc`,
      tone: 'success',
    },
    { label: 'Đang làm', value: inProgress, hint: `${pct(inProgress)}% tổng việc` },
    {
      label: 'Quá hạn',
      value: data.overdueTasks,
      hint: data.overdueTasks > 0 ? 'cần xử lý sớm' : 'không có việc quá hạn',
      tone: data.overdueTasks > 0 ? 'danger' : 'default',
    },
  ];
}

export function Dashboard() {
  // Từ khoá tìm nhập ở AppHeader (store) → lọc luôn panel "Dự án" bên dưới.
  const projectSearch = useTasksUIStore((s) => s.projectSearch);
  const debouncedSearch = useDebouncedValue(projectSearch, 300);
  const projectsQuery = useProjectsInfinite(debouncedSearch);
  const projects = projectsQuery.data?.pages.flatMap((p) => p.data) ?? [];

  const myTasks = useMyTasks();
  const { overdueCount, todayCount } = useMyTaskBuckets(myTasks.data);
  const overview = useStatsOverview();

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-7">
        <HomeHero
          overdueCount={overdueCount}
          todayCount={todayCount}
          isPending={myTasks.isPending}
        />

        {overview.isPending && <Skeleton className="h-[96px] w-full" rounded="lg" />}
        {overview.isError && (
          <p className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-[12.5px] text-danger">
            Không tải được số liệu tổng quan.
          </p>
        )}
        {overview.data && <StatBar items={buildStatItems(overview.data)} />}

        {/* items-start: panel rỗng co theo nội dung, không bị kéo cao bằng cột bên cạnh */}
        <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
          <MyTasksPanel
            tasks={myTasks.data}
            isPending={myTasks.isPending}
            isError={myTasks.isError}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <ProjectsPanel
              projects={projects}
              isLoading={projectsQuery.isLoading}
              isError={projectsQuery.isError}
              isSearching={debouncedSearch.trim().length > 0}
              hasNextPage={Boolean(projectsQuery.hasNextPage)}
              isFetchingNextPage={projectsQuery.isFetchingNextPage}
              onLoadMore={() => void projectsQuery.fetchNextPage()}
            />
            <ActivityPanel />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
