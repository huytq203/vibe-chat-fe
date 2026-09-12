'use client';

import { Avatar } from '@/components/ui/avatar/Avatar';
import { useReports } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { Panel, PanelState } from '../common';
import type { ReportPeriod } from '../../types';

interface LeaderboardPanelProps {
  projectName?: string;
  className?: string;
  period: ReportPeriod;
}

const LEADERBOARD_GRID =
  'grid min-w-[430px] grid-cols-[minmax(140px,1fr)_72px_72px_84px] items-center gap-3';

export function LeaderboardPanel({ projectName, className, period }: LeaderboardPanelProps) {
  // Leaderboard theo project đang chọn trong store; chưa chọn → query không chạy
  const selectedProjectId = useTasksUIStore((s) => s.selectedProjectId);
  const { leaderboard } = useReports(selectedProjectId, period);
  const entries = [...(leaderboard.data?.entries ?? [])].sort(
    (left, right) => right.gems - left.gems,
  );

  return (
    <Panel
      title="Khối lượng theo thành viên"
      action={
        projectName && (
          <span className="max-w-[180px] truncate text-[11.5px] text-muted-foreground">
            {projectName}
          </span>
        )
      }
      className={className}
    >
      {!selectedProjectId && (
        <PanelState>Mở một dự án để xem thống kê theo thành viên của dự án đó.</PanelState>
      )}
      {selectedProjectId && leaderboard.isPending && <PanelState>Đang tải bảng xếp hạng…</PanelState>}
      {selectedProjectId && leaderboard.isError && (
        <PanelState tone="danger">Không tải được bảng xếp hạng thành viên.</PanelState>
      )}
      {selectedProjectId && leaderboard.data && entries.length === 0 && (
        <PanelState>Chưa có dữ liệu thành viên cho dự án này.</PanelState>
      )}

      {selectedProjectId && entries.length > 0 && (
        <div className="overflow-x-auto px-2 pb-1">
          <div
            className={`${LEADERBOARD_GRID} border-b border-border/60 pb-2 text-xs font-semibold text-muted-foreground`}
          >
            <span>Thành viên</span>
            <span className="text-right">Gem</span>
            <span className="text-right">Đúng hạn</span>
            <span className="text-right">Task xong</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.userId} className={`${LEADERBOARD_GRID} py-2.5`}>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar fallback={entry.displayName.charAt(0).toUpperCase()} size="sm" />
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {entry.displayName}
                </span>
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-primary">
                {entry.gems}
              </span>
              <span className="text-right text-[12.5px] tabular-nums text-muted-foreground">
                {entry.onTimeRate === null ? '—' : `${entry.onTimeRate}%`}
              </span>
              <span className="text-right text-[12.5px] tabular-nums text-muted-foreground">
                {entry.completedTasks}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
