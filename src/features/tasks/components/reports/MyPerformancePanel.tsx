'use client';

import { useMyPerformance } from '../../hooks/useReports';
import type { ReportPeriod } from '../../types';
import { Panel, PanelState } from '../common';

export function MyPerformancePanel({ period }: { period: ReportPeriod }) {
  const performance = useMyPerformance(period);

  return (
    <Panel title="Hiệu suất của tôi" className="mt-4">
      {performance.isPending && <PanelState>Đang tải hiệu suất…</PanelState>}
      {performance.isError && (
        <PanelState tone="danger">Không tải được hiệu suất của bạn.</PanelState>
      )}
      {performance.data && (
        <div className="px-2 pb-1">
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 px-3 py-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gem đã nhận</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                {performance.data.gems}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Task xong</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {performance.data.completedTasks}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Đúng hạn</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {performance.data.onTimeRate === null
                  ? '—'
                  : `${performance.data.onTimeRate}%`}
              </p>
            </div>
          </div>

          <div className="mt-3 border-b border-border/60 pb-2 text-xs font-semibold text-muted-foreground">
            Theo dự án
          </div>
          {performance.data.byProject.length === 0 ? (
            <PanelState>Chưa có task hoàn thành trong kỳ này.</PanelState>
          ) : (
            performance.data.byProject.map((project) => (
              <div
                key={project.projectId}
                className="grid grid-cols-[minmax(0,1fr)_72px_72px] items-center gap-3 py-2.5"
              >
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {project.projectName}
                </span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">
                  {project.completedTasks} task
                </span>
                <span className="text-right text-xs font-bold tabular-nums text-primary">
                  {project.gems} gem
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Panel>
  );
}
