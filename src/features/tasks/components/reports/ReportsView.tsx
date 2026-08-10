'use client';

import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useStatsOverview } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { ReportsOverview } from './ReportsOverview';
import { LeaderboardPanel } from './LeaderboardPanel';

export function ReportsView() {
  const overview = useStatsOverview();
  const selectedProjectId = useTasksUIStore((s) => s.selectedProjectId);
  const selectedProjectName = overview.data?.projects.find(
    (p) => p.projectId === selectedProjectId,
  )?.projectName;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-7">
        {overview.isPending && (
          <div role="status" aria-label="Đang tải số liệu báo cáo">
            <Skeleton className="h-[96px] w-full" rounded="lg" />
            <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
              Đang tải số liệu báo cáo…
            </p>
          </div>
        )}
        {overview.isError && (
          <p className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-[12.5px] text-danger">
            Không tải được số liệu báo cáo. Vui lòng thử lại sau.
          </p>
        )}
        {overview.data && <ReportsOverview data={overview.data} />}

        <LeaderboardPanel projectName={selectedProjectName} className="mt-4" />
      </div>
    </ScrollArea>
  );
}
