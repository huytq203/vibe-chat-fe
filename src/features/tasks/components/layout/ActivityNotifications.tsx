'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Text } from '@/components/ui/typography/Typography';
import { useTaskActivityNotifications } from '../../hooks/useTaskActivityNotifications';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { Activity } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.updated': 'đã cập nhật task',
  'task.moved': 'đã di chuyển task',
  'task.deleted': 'đã xoá task',
  'task.completed': 'đã hoàn thành task',
  'task.reopened': 'đã mở lại task',
  'comment.created': 'đã bình luận',
  'column.created': 'đã tạo cột',
  'column.updated': 'đã cập nhật cột',
  'column.deleted': 'đã xoá cột',
  'member.added': 'đã thêm thành viên',
  'member.removed': 'đã gỡ thành viên',
  'tag.created': 'đã tạo nhãn',
  'tag.updated': 'đã cập nhật nhãn',
  'tag.deleted': 'đã xoá nhãn',
  'tag.attached': 'đã gắn nhãn vào task',
  'tag.detached': 'đã gỡ nhãn khỏi task',
  'project.updated': 'đã cập nhật dự án',
  'project.deleted': 'đã xoá dự án',
  'assignee.added': 'đã thêm người thực hiện',
};

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} ngày trước` : new Date(iso).toLocaleDateString('vi-VN');
}

function ActivityItem({
  activity,
  unread,
  onRead,
  onSelect,
}: {
  activity: Activity;
  unread: boolean;
  onRead: () => void;
  onSelect: () => void;
}) {
  const setSelectedProjectId = useTasksUIStore((state) => state.setSelectedProjectId);
  const openTask = useTasksUIStore((state) => state.openTask);

  const handleClick = () => {
    if (unread) onRead();
    onSelect();
    setSelectedProjectId(activity.projectId);
    if (activity.taskId) openTask(activity.taskId);
  };

  return (
    <div className={unread ? 'flex items-center bg-primary/5' : 'flex items-center'}>
      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-3 text-left hover:bg-accent"
      >
        <span
          className={
            unread
              ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary'
              : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30'
          }
        />
        <span className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <span className={unread ? 'font-semibold' : 'font-medium'}>{activity.actorName}</span>
            <span className="ml-1 text-muted-foreground">
              {ACTION_LABELS[activity.action] ?? activity.action}
            </span>
          </p>
          <Text size="xs" color="muted" className="mt-0.5">
            {formatRelativeTime(activity.createdAt)}
          </Text>
        </span>
      </button>
      {unread && (
        <button
          type="button"
          onClick={onRead}
          aria-label="Đánh dấu hoạt động đã đọc"
          title="Đánh dấu đã đọc"
          className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ActivityNotifications() {
  const [open, setOpen] = useState(false);
  const { feed, unreadCount, isUnread, markRead, markAllRead } =
    useTaskActivityNotifications();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="Thông báo hoạt động"
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:bg-accent"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" showArrow={false} className="w-[360px] p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Hoạt động</p>
            <p className="text-xs text-muted-foreground">Cập nhật mới từ các dự án của bạn</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-4 w-4" />
              Đọc tất cả
            </button>
          )}
        </div>
        {feed.isPending && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải…</p>}
        {feed.isError && <p className="px-4 py-8 text-center text-sm text-danger">Không tải được hoạt động.</p>}
        {feed.data?.items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
        )}
        {feed.data && feed.data.items.length > 0 && (
          <ScrollArea className="max-h-[420px]">
            <div className="divide-y divide-border">
              {feed.data.items.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  unread={isUnread(activity)}
                  onRead={() => markRead(activity.id)}
                  onSelect={() => setOpen(false)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
