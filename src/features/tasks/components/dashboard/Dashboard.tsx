'use client';

import { useRef } from 'react';
import { CheckCircle2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { cn } from '@/lib/utils/cn';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useProjectsInfinite } from '../../hooks/useProjectsInfinite';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMyTasks } from '../../hooks/useMyTasks';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { getViewTitle } from '../../lib/view-title';
import { PRIORITY_CONFIG, formatDueDate } from '../board/TaskCard';
import { PageHeading } from '../common';
import { DashboardProjectRow } from './DashboardProjectRow';
import type { Activity, MyTask } from '../../types';

/** Map action code từ backend → mô tả tiếng Việt ngắn; không có trong map thì hiển thị raw */
const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.updated': 'đã cập nhật task',
  'task.moved': 'đã di chuyển task',
  'task.deleted': 'đã xoá task',
  'comment.created': 'đã bình luận',
  'column.created': 'đã tạo cột',
  'column.updated': 'đã cập nhật cột',
  'column.deleted': 'đã xoá cột',
  'member.added': 'đã thêm thành viên',
  'member.removed': 'đã gỡ thành viên',
  'tag.created': 'đã tạo nhãn',
  'tag.updated': 'đã cập nhật nhãn',
  'tag.deleted': 'đã xoá nhãn',
  'project.updated': 'đã cập nhật dự án',
  'project.deleted': 'đã xoá dự án',
  'assignee.added': 'đã thêm người thực hiện',
  'task.reopened': 'đã mở lại task',
  'task.completed': 'đã hoàn thành task',
};

/** Thời gian tương đối tiếng Việt — helper nội bộ, không thêm dependency */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function EmptyPanel({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <Text weight="medium">{title}</Text>
      <Text size="sm" color="muted">{desc}</Text>
    </div>
  );
}

function MyTaskRow({ task }: { task: MyTask }) {
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <button
      type="button"
      // setSelectedProjectId đồng thời chuyển activeView sang 'board' (xem tasks-ui.store)
      onClick={() => setSelectedProjectId(task.projectId)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent"
    >
      <span className="min-w-0 flex-1">
        <Text size="sm" weight="medium" truncate>{task.title}</Text>
      </span>
      <Badge variant="outline" size="sm" className="max-w-[140px] shrink-0">
        <span className="truncate">{task.projectName}</span>
      </Badge>
      {due && (
        <Text
          size="xs"
          numeric
          className={cn('shrink-0', due.isPast ? 'text-danger' : 'text-muted-foreground')}
        >
          {due.label}
        </Text>
      )}
      {priority && task.priority && (
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
            priority.bg,
            priority.text,
          )}
        >
          {task.priority}
        </span>
      )}
    </button>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const actionLabel = ACTION_LABELS[activity.action] ?? activity.action;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
      <div className="min-w-0 flex-1">
        <Text size="sm" className="leading-snug">
          <span className="font-medium">{activity.actorName}</span>{' '}
          <span className="text-muted-foreground">{actionLabel}</span>
        </Text>
        <Text size="xs" color="muted"> - {formatRelativeTime(activity.createdAt)}</Text>
      </div>
    </div>
  );
}

export function Dashboard() {
  // Tìm dự án nhập ở AppHeader (store) → lọc luôn card "Dự án" dưới đây.
  const projectSearch = useTasksUIStore((s) => s.projectSearch);
  const debouncedSearch = useDebouncedValue(projectSearch, 300);
  const projectsQuery = useProjectsInfinite(debouncedSearch);
  const projects = projectsQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const projectsScrollRef = useRef<HTMLDivElement>(null);
  const projectsSentinelRef = useInfiniteScroll({
    rootRef: projectsScrollRef,
    hasNextPage: projectsQuery.hasNextPage,
    isFetchingNextPage: projectsQuery.isFetchingNextPage,
    onLoadMore: () => void projectsQuery.fetchNextPage(),
  });
  const isLoading = projectsQuery.isLoading;
  const isError = projectsQuery.isError;

  const myTasks = useMyTasks();
  const feed = useActivityFeed(1, 15);
  const { title, sub } = getViewTitle('home');

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <PageHeading title={title} sub={sub} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nhiệm vụ của bạn</CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.isPending && <Text size="sm" color="muted">Đang tải nhiệm vụ…</Text>}
              {myTasks.isError && (
                <Text size="sm" className="text-danger">Không tải được danh sách nhiệm vụ.</Text>
              )}
              {myTasks.data && myTasks.data.length === 0 && (
                <EmptyPanel
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="Chưa có nhiệm vụ được giao"
                  desc="Danh sách việc của bạn sẽ xuất hiện ở đây."
                />
              )}
              {myTasks.data && myTasks.data.length > 0 && (
                <ScrollArea className="h-[360px]">
                  <div className="flex flex-col pr-3">
                    {myTasks.data.map((t) => (
                      <MyTaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              {feed.isPending && <Text size="sm" color="muted">Đang tải hoạt động…</Text>}
              {feed.isError && (
                <Text size="sm" className="text-danger">Không tải được hoạt động.</Text>
              )}
              {feed.data && feed.data.items.length === 0 && (
                <EmptyPanel
                  icon={<Bell className="h-6 w-6" />}
                  title="Yên bình quá…"
                  desc="Chưa có hoạt động nào."
                />
              )}
              {feed.data && feed.data.items.length > 0 && (
                <div className="flex flex-col divide-y divide-border">
                  {feed.data.items.slice(0, 8).map((a) => (
                    <ActivityRow key={a.id} activity={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Dự án</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading && <Text size="sm" color="muted">Đang tải dự án…</Text>}
            {isError && <Text size="sm" color="muted">Không tải được danh sách dự án.</Text>}
            {!isLoading && !isError && projects.length === 0 && (
              <Text size="sm" color="muted">
                {debouncedSearch.trim()
                  ? 'Không tìm thấy dự án khớp từ khoá.'
                  : 'Chưa có dự án. Bấm "Tạo mới" để bắt đầu.'}
              </Text>
            )}
            {/* Khung cao ~5 dòng: mặc định thấy 5 dự án, cuộn xuống để lazy load thêm */}
            <div ref={projectsScrollRef} className="flex max-h-[340px] flex-col overflow-y-auto">
              {projects.map((p) => (
                <DashboardProjectRow key={p.id} project={p} />
              ))}
              {projectsQuery.hasNextPage && (
                <div ref={projectsSentinelRef} className="py-2 text-center">
                  {projectsQuery.isFetchingNextPage && (
                    <Text size="xs" color="muted">
                      Đang tải thêm…
                    </Text>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
