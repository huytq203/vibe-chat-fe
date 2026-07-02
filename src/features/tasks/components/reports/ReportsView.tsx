'use client';

import { ListTodo, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Progress } from '@/components/ui/progress/Progress';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { cn } from '@/lib/utils/cn';
import { useReports, useStatsOverview } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { getViewTitle } from '../../lib/view-title';
import { PageHeading } from '../common';
import { StatCard } from './StatCard';
import type { StatsOverview } from '../../types';

/** Số liệu dẫn xuất từ overview cho chart trạng thái (donut CSS thuần) */
function deriveStatusBreakdown(data: StatsOverview) {
  // "Đang làm" chỉ có ở cấp project → cộng dồn từ projects[]
  const inProgress = data.projects.reduce((sum, p) => sum + p.inProgressTasks, 0);
  const pct = (n: number) => (data.totalTasks > 0 ? Math.round((n / data.totalTasks) * 100) : 0);
  const donePct = pct(data.completedTasks);
  const progressPct = pct(inProgress);
  const restPct = Math.max(0, 100 - donePct - progressPct);
  return { inProgress, donePct, progressPct, restPct };
}

function OverviewContent({ data }: { data: StatsOverview }) {
  const { inProgress, donePct, progressPct, restPct } = deriveStatusBreakdown(data);

  const statCards = [
    {
      label: 'Tổng việc',
      value: String(data.totalTasks),
      delta: `trên ${data.totalProjects} dự án`,
      icon: <ListTodo className="h-4 w-4" />,
    },
    {
      label: 'Hoàn thành',
      value: String(data.completedTasks),
      delta: `${donePct}% tổng việc`,
      deltaTone: 'up' as const,
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: 'Đang làm',
      value: String(inProgress),
      delta: `${progressPct}% tổng việc`,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Quá hạn',
      value: String(data.overdueTasks),
      delta: data.overdueTasks > 0 ? 'cần xử lý sớm' : 'không có việc quá hạn',
      deltaTone: data.overdueTasks > 0 ? ('down' as const) : ('up' as const),
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

  const donutLegend = [
    { label: 'Đang làm', pct: progressPct, className: 'bg-chart-1' },
    { label: 'Hoàn thành', pct: donePct, className: 'bg-chart-2' },
    { label: 'Chưa bắt đầu', pct: restPct, className: 'bg-chart-3' },
  ];
  const donutGradient = `conic-gradient(var(--chart-1) 0 ${progressPct}%, var(--chart-2) ${progressPct}% ${progressPct + donePct}%, var(--chart-3) ${progressPct + donePct}% 100%)`;

  return (
    <>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Tiến độ hoàn thành theo dự án</CardTitle></CardHeader>
          <CardContent>
            {data.projects.length === 0 ? (
              <Text size="sm" color="muted">Chưa có dự án nào để thống kê.</Text>
            ) : (
              <div className="flex h-[190px] items-end gap-4">
                {data.projects.map((p) => (
                  <div key={p.projectId} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <Text size="xs" color="muted" numeric>{p.completionRate}%</Text>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
                      style={{ height: `${Math.max(p.completionRate, 3)}%` }}
                    />
                    <Text size="xs" color="muted" truncate className="w-full text-center">
                      {p.projectName}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Phân bổ trạng thái</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-5 grid place-items-center">
              <div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: donutGradient }}>
                <div className="grid h-24 w-24 place-items-center rounded-full bg-background">
                  <span className="text-2xl font-extrabold text-foreground">{data.totalTasks}</span>
                  <Text size="xs" color="muted">tổng việc</Text>
                </div>
              </div>
            </div>
            {donutLegend.map((d) => (
              <div key={d.label} className="flex items-center gap-2 py-1.5">
                <span className={`h-3 w-3 rounded-sm ${d.className}`} />
                <Text size="sm" className="flex-1">{d.label}</Text>
                <Text size="sm" weight="bold" numeric>{d.pct}%</Text>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Chi tiết theo dự án</CardTitle></CardHeader>
        <CardContent>
          {data.projects.length === 0 ? (
            <Text size="sm" color="muted">Chưa có dự án nào.</Text>
          ) : (
            <>
              <div className="grid grid-cols-[1.4fr_64px_64px_72px_1fr] items-center gap-3 border-b border-border pb-2">
                <Text size="xs" color="muted">Dự án</Text>
                <Text size="xs" color="muted" className="text-right">Tổng</Text>
                <Text size="xs" color="muted" className="text-right">Xong</Text>
                <Text size="xs" color="muted" className="text-right">Quá hạn</Text>
                <Text size="xs" color="muted">Tiến độ</Text>
              </div>
              {data.projects.map((p) => (
                <div key={p.projectId} className="grid grid-cols-[1.4fr_64px_64px_72px_1fr] items-center gap-3 py-2.5">
                  <Text size="sm" weight="medium" truncate>{p.projectName}</Text>
                  <Text size="sm" color="muted" numeric className="text-right">{p.totalTasks}</Text>
                  <Text size="sm" color="muted" numeric className="text-right">{p.completedTasks}</Text>
                  <Text
                    size="sm"
                    numeric
                    className={cn('text-right', p.overdueTasks > 0 ? 'text-danger' : 'text-muted-foreground')}
                  >
                    {p.overdueTasks}
                  </Text>
                  <span className="flex items-center gap-2">
                    <Progress value={p.completionRate} size="sm" variant="gradient" className="flex-1" />
                    <Text size="xs" color="muted" numeric className="w-10 text-right">{p.completionRate}%</Text>
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function ReportsView() {
  const { title, sub } = getViewTitle('reports');
  const overview = useStatsOverview();
  // Leaderboard theo project đang chọn trong store; chưa chọn → query không chạy
  const selectedProjectId = useTasksUIStore((s) => s.selectedProjectId);
  const { leaderboard } = useReports(selectedProjectId);
  const selectedProjectName = overview.data?.projects.find(
    (p) => p.projectId === selectedProjectId,
  )?.projectName;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <PageHeading title={title} sub={sub} />

        {overview.isPending && <Text size="sm" color="muted">Đang tải số liệu báo cáo…</Text>}
        {overview.isError && (
          <Text size="sm" className="text-danger">Không tải được số liệu báo cáo. Vui lòng thử lại sau.</Text>
        )}
        {overview.data && <OverviewContent data={overview.data} />}

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">
              Khối lượng theo thành viên{selectedProjectName ? ` — ${selectedProjectName}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProjectId && (
              <Text size="sm" color="muted">Mở một dự án để xem thống kê theo thành viên của dự án đó.</Text>
            )}
            {selectedProjectId && leaderboard.isPending && (
              <Text size="sm" color="muted">Đang tải bảng xếp hạng…</Text>
            )}
            {selectedProjectId && leaderboard.isError && (
              <Text size="sm" className="text-danger">Không tải được bảng xếp hạng thành viên.</Text>
            )}
            {selectedProjectId && leaderboard.data && leaderboard.data.entries.length === 0 && (
              <Text size="sm" color="muted">Chưa có dữ liệu thành viên cho dự án này.</Text>
            )}
            {selectedProjectId &&
              leaderboard.data?.entries.map((e) => {
                // % hoàn thành trên tổng việc được gán của từng thành viên
                const pct = e.totalAssigned > 0 ? Math.round((e.completedTasks / e.totalAssigned) * 100) : 0;
                return (
                  <div key={e.userId} className="flex items-center gap-4 py-2">
                    <Avatar fallback={e.displayName.charAt(0)} size="sm" />
                    <Text size="sm" weight="medium" truncate className="w-28 shrink-0">{e.displayName}</Text>
                    <Progress value={pct} size="sm" variant="gradient" className="flex-1" />
                    <Text size="sm" color="muted" numeric className="w-20 text-right">
                      {e.completedTasks}/{e.totalAssigned} việc
                    </Text>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
