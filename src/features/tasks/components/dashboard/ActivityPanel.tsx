'use client';

import { Avatar } from '@/components/ui/avatar/Avatar';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { formatRelativeTime, getActionLabel } from '../../lib/activity-format';
import { Panel, PanelState } from '../common';
import type { Activity } from '../../types';

const FEED_SIZE = 8;

function ActivityRow({ activity }: { activity: Activity }) {
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const openTask = useTasksUIStore((s) => s.openTask);

  const handleClick = () => {
    setSelectedProjectId(activity.projectId);
    if (activity.taskId) openTask(activity.taskId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${activity.actorName} ${getActionLabel(activity.action)}`}
      className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar
        src={activity.actorAvatar ?? undefined}
        fallback={activity.actorName.charAt(0).toUpperCase()}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">{activity.actorName}</span>{' '}
          {getActionLabel(activity.action)}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatRelativeTime(activity.createdAt)}
        </span>
      </span>
    </button>
  );
}

export function ActivityPanel() {
  const feed = useActivityFeed(1, FEED_SIZE);
  const items = feed.data?.items ?? [];

  return (
    <Panel title="Hoạt động gần đây" bodyClassName="max-h-[300px] overflow-y-auto pr-0.5">
      {feed.isPending && <PanelState>Đang tải hoạt động…</PanelState>}
      {feed.isError && <PanelState tone="danger">Không tải được hoạt động.</PanelState>}
      {!feed.isPending && !feed.isError && items.length === 0 && (
        <PanelState>Chưa có hoạt động nào trong các dự án của bạn.</PanelState>
      )}
      {items.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} />
      ))}
    </Panel>
  );
}
