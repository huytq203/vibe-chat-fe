'use client';

import { Progress } from '@/components/ui/progress/Progress';
import { cn } from '@/lib/utils/cn';
import { Panel, PanelState, StatBar, type StatBarItem } from '../common';
import type { StatsOverview } from '../../types';

/** Số liệu dẫn xuất từ overview cho chart trạng thái (donut CSS thuần) */
function deriveStatusBreakdown(data: StatsOverview) {
  // "Đang làm" chỉ có ở cấp project → cộng dồn từ projects[]
  const inProgress = data.projects.reduce((sum, p) => sum + p.inProgressTasks, 0);
  const pct = (n: number) => (data.totalTasks > 0 ? Math.round((n / data.totalTasks) * 100) : 0);
  const donePct = pct(data.completedTasks);
  const progressPct = pct(inProgress);
  return { inProgress, donePct, progressPct, restPct: Math.max(0, 100 - donePct - progressPct) };
}

function buildStatItems(data: StatsOverview, inProgress: number, donePct: number, progressPct: number): StatBarItem[] {
  return [
    { label: 'Tổng việc', value: data.totalTasks, hint: `trên ${data.totalProjects} dự án` },
    { label: 'Hoàn thành', value: data.completedTasks, hint: `${donePct}% tổng việc`, tone: 'success' },
    { label: 'Đang làm', value: inProgress, hint: `${progressPct}% tổng việc` },
    {
      label: 'Quá hạn',
      value: data.overdueTasks,
      hint: data.overdueTasks > 0 ? 'cần xử lý sớm' : 'không có việc quá hạn',
      tone: data.overdueTasks > 0 ? 'danger' : 'default',
    },
  ];
}

const DETAIL_GRID = 'grid grid-cols-[1.4fr_56px_56px_64px_minmax(0,1fr)] items-center gap-3';

export function ReportsOverview({ data }: { data: StatsOverview }) {
  const { inProgress, donePct, progressPct, restPct } = deriveStatusBreakdown(data);

  const donutLegend = [
    { label: 'Đang làm', pct: progressPct, className: 'bg-chart-1' },
    { label: 'Hoàn thành', pct: donePct, className: 'bg-chart-2' },
    { label: 'Chưa bắt đầu', pct: restPct, className: 'bg-chart-3' },
  ];
  const donutGradient = `conic-gradient(var(--chart-1) 0 ${progressPct}%, var(--chart-2) ${progressPct}% ${progressPct + donePct}%, var(--chart-3) ${progressPct + donePct}% 100%)`;

  return (
    <>
      <StatBar items={buildStatItems(data, inProgress, donePct, progressPct)} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Tiến độ hoàn thành theo dự án">
          {data.projects.length === 0 ? (
            <PanelState>Chưa có dự án nào để thống kê.</PanelState>
          ) : (
            <div className="flex h-[190px] items-end gap-4 px-2 pb-1">
              {data.projects.map((p) => (
                <div key={p.projectId} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {p.completionRate}%
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
                    style={{ height: `${Math.max(p.completionRate, 3)}%` }}
                  />
                  <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                    {p.projectName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Phân bổ trạng thái">
          <div className="grid place-items-center py-2">
            <div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: donutGradient }}>
              <div className="grid h-24 w-24 place-items-center rounded-full bg-background">
                <span className="text-2xl font-extrabold tabular-nums text-foreground">
                  {data.totalTasks}
                </span>
                <span className="text-[11px] text-muted-foreground">tổng việc</span>
              </div>
            </div>
          </div>
          <div className="px-2 pb-1">
            {donutLegend.map((d) => (
              <div key={d.label} className="flex items-center gap-2 py-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-sm', d.className)} />
                <span className="flex-1 text-[12.5px] text-foreground">{d.label}</span>
                <span className="text-[12.5px] font-bold tabular-nums text-foreground">{d.pct}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Chi tiết theo dự án" className="mt-4">
        {data.projects.length === 0 ? (
          <PanelState>Chưa có dự án nào.</PanelState>
        ) : (
          <div className="px-2 pb-1">
            <div className={cn(DETAIL_GRID, 'border-b border-border/60 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground')}>
              <span>Dự án</span>
              <span className="text-right">Tổng</span>
              <span className="text-right">Xong</span>
              <span className="text-right">Quá hạn</span>
              <span>Tiến độ</span>
            </div>
            {data.projects.map((p) => (
              <div key={p.projectId} className={cn(DETAIL_GRID, 'py-2.5')}>
                <span className="truncate text-[12.5px] font-medium text-foreground">{p.projectName}</span>
                <span className="text-right text-[12.5px] tabular-nums text-muted-foreground">{p.totalTasks}</span>
                <span className="text-right text-[12.5px] tabular-nums text-muted-foreground">{p.completedTasks}</span>
                <span className={cn('text-right text-[12.5px] tabular-nums', p.overdueTasks > 0 ? 'font-semibold text-danger' : 'text-muted-foreground')}>
                  {p.overdueTasks}
                </span>
                <span className="flex items-center gap-2">
                  <Progress value={p.completionRate} size="sm" variant="gradient" className="flex-1" />
                  <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                    {p.completionRate}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
