'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useStatsOverview } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { ReportsOverview } from './ReportsOverview';
import { LeaderboardPanel } from './LeaderboardPanel';
import { MyPerformancePanel } from './MyPerformancePanel';
import type { ReportPeriod } from '../../types';

export function ReportsView() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const overview = useStatsOverview();
  const selectedProjectId = useTasksUIStore((s) => s.selectedProjectId);
  const selectedProjectName = overview.data?.projects.find(
    (p) => p.projectId === selectedProjectId,
  )?.projectName;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-7">
        <div className="mb-4 flex justify-end">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Kỳ báo cáo
            <select
              aria-label="Kỳ báo cáo"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 max-md:min-h-11"
            >
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
        </div>
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

        <MyPerformancePanel period={period} />
        <LeaderboardPanel
          projectName={selectedProjectName}
          period={period}
          className="mt-4"
        />
      </div>
    </ScrollArea>
  );
}
