'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert/Alert';
import { Button } from '@/components/ui/button/Button';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { getCurrentUser } from '../../lib/current-user';
import { useProjects } from '../../hooks/useProjects';
import { useReports, useStatsOverview } from '../../hooks/useReports';
import type { ReportPeriod } from '../../types';
import { LeaderboardPanel } from './LeaderboardPanel';
import { MyPerformancePanel } from './MyPerformancePanel';
import { ReportsFilters } from './ReportsFilters';
import { ReportsOverview } from './ReportsOverview';

export function ReportsView() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [projectId, setProjectId] = useState<string>();
  const projects = useProjects();
  const reports = useReports({ period, projectId });
  const overview = useStatsOverview();
  const currentUser = getCurrentUser();

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full w-full bg-muted/20 font-sans">
        <ReportsFilters
          period={period}
          projectId={projectId}
          projects={projects.data ?? []}
          isLoadingProjects={projects.isPending}
          onPeriodChange={setPeriod}
          onProjectChange={setProjectId}
        />

        <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
          <MyPerformancePanel
            projectId={projectId}
            query={reports.myPerformance}
            currentUser={currentUser}
          />
          <LeaderboardPanel query={reports.leaderboard} currentUser={currentUser} />

          <section aria-label="Tổng quan tiến độ project" className="pt-1">
            {overview.isPending ? (
              <div role="status" aria-label="Đang tải tổng quan tiến độ" className="space-y-3">
                <Skeleton className="h-20 w-full" rounded="lg" />
                <Skeleton className="h-48 w-full" rounded="lg" />
              </div>
            ) : overview.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Không tải được tổng quan tiến độ project.</AlertTitle>
                <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span>Kiểm tra kết nối rồi thử tải lại báo cáo.</span>
                  <Button variant="danger-outline" size="sm" onClick={() => void overview.refetch()}>
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            ) : overview.data ? (
              <ReportsOverview data={overview.data} />
            ) : null}
          </section>
        </div>
      </div>
    </ScrollArea>
  );
}
