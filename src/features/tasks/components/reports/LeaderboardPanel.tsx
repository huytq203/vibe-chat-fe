'use client';

import { Avatar } from '@/components/ui/avatar/Avatar';
import { Progress } from '@/components/ui/progress/Progress';
import { useReports } from '../../hooks/useReports';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { Panel, PanelState } from '../common';

interface LeaderboardPanelProps {
  projectName?: string;
  className?: string;
}

export function LeaderboardPanel({ projectName, className }: LeaderboardPanelProps) {
  // Leaderboard theo project đang chọn trong store; chưa chọn → query không chạy
  const selectedProjectId = useTasksUIStore((s) => s.selectedProjectId);
  const { leaderboard } = useReports(selectedProjectId);
  const entries = leaderboard.data?.entries ?? [];

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

      {selectedProjectId &&
        entries.map((entry) => {
          // % hoàn thành trên tổng việc được gán của từng thành viên
          const pct =
            entry.totalAssigned > 0
              ? Math.round((entry.completedTasks / entry.totalAssigned) * 100)
              : 0;
          return (
            <div key={entry.userId} className="flex items-center gap-3 px-2 py-2">
              <Avatar fallback={entry.displayName.charAt(0).toUpperCase()} size="sm" />
              <span className="w-28 shrink-0 truncate text-[12.5px] font-medium text-foreground">
                {entry.displayName}
              </span>
              <Progress value={pct} size="sm" variant="gradient" className="flex-1" />
              <span className="w-20 shrink-0 text-right text-[11.5px] tabular-nums text-muted-foreground">
                {entry.completedTasks}/{entry.totalAssigned} việc
              </span>
            </div>
          );
        })}
    </Panel>
  );
}
