'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import {
  useNotificationsInfinite,
  useUnreadCount,
} from '@/features/notifications/hooks/use-query';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/features/notifications/hooks/use-mutations';
import { getNotificationHref } from '@/features/notifications/utils';
import type { Notification } from '@/features/notifications/types';
import { NotificationItem } from './NotificationItem';

type NotificationListPanelProps = {
  /** Quay về danh sách hội thoại (thay thế nội dung như SearchOverlay). */
  onBack: () => void;
};

/** Panel thông báo inline trong sidebar — list lazy load + đọc tất cả. */
export function NotificationListPanel({ onBack }: NotificationListPanelProps) {
  const router = useRouter();
  const query = useNotificationsInfinite();
  const items = query.data?.pages.flatMap((p) => p.items.filter((item) => item.type !== "MESSAGE_NEW")) ?? [];
  const unreadCount = useUnreadCount().data?.unreadCount ?? 0;
  const markReadMut = useMarkNotificationRead();
  const markAllMut = useMarkAllNotificationsRead();
  const deleteMut = useDeleteNotification();
  // Lazy load: cuộn gần cuối → nạp trang kế tiếp.
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }

  function handleClick(n: Notification) {
    if (!n.isRead) markReadMut.mutate(n.id);
    onBack();
    router.push(getNotificationHref(n));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <span className="flex-1 text-sm font-bold">
          Thông báo
          {unreadCount > 0 && items.length > 0 && (
            <span className="ml-1.5 text-[12px] font-semibold text-muted-foreground">
              {unreadCount} chưa đọc
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={markAllMut.isPending}
            onClick={() => markAllMut.mutate()}
            title="Đánh dấu tất cả đã đọc"
            className="text-primary"
          >
            <CheckCheck className="mr-1 h-4 w-4" /> Đọc tất cả
          </Button>
        )}
      </div>

      <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-2 pb-2">
        {query.isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!query.isLoading && items.length === 0 && (
          <div className="px-3 py-10 text-center text-xs text-muted-foreground">
            Chưa có thông báo
          </div>
        )}
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onClick={handleClick}
            onDelete={(id) => deleteMut.mutate(id)}
            isDeleting={deleteMut.isPending && deleteMut.variables === n.id}
          />
        ))}
        {query.isFetchingNextPage && (
          <div className="py-2 text-center text-[11px] text-muted-foreground">
            Đang tải thêm...
          </div>
        )}
      </div>
    </div>
  );
}
