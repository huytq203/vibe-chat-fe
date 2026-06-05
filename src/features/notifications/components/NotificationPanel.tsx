'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { useNotifications, useUnreadCount } from '@/features/notifications/hooks/use-query';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/features/notifications/hooks/use-mutations';
import { getNotificationHref } from '@/features/notifications/utils';
import type { Notification } from '@/features/notifications/types';
import { NotificationItem } from './NotificationItem';

type Tab = 'all' | 'unread';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NotificationPanel({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const { data, isLoading } = useNotifications({
    page: 1,
    limit: 30,
    unreadOnly: tab === 'unread',
  });
  const unread = useUnreadCount();
  const markReadMut = useMarkNotificationRead();
  const markAllMut = useMarkAllNotificationsRead();
  const deleteMut = useDeleteNotification();

  const items = data?.items ?? [];
  const unreadCount = unread.data?.unreadCount ?? data?.unreadCount ?? 0;

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMut.mutate(n.id);
    onOpenChange(false);
    router.push(getNotificationHref(n));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[680px] max-w-md flex-col overflow-hidden p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <DialogTitle>Thông báo</DialogTitle>
            <DialogDescription>
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
            </DialogDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markAllMut.isPending}
              onClick={() => markAllMut.mutate()}
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="mr-1 h-4 w-4" /> Đọc hết
            </Button>
          )}
        </DialogHeader>

        <div className="shrink-0 px-4 pt-3">
          <Tabs value={tab} onValueChange={(v) => setTab((v as Tab) ?? 'all')}>
            <TabsList size="sm" className="w-full">
              <TabsTrigger value="all" className="flex-1">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 gap-1.5">
                Chưa đọc
                {unreadCount > 0 && (
                  <Badge variant="default" size="sm">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && items.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              {tab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
            </div>
          )}
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleClick}
              onDelete={(id) => deleteMut.mutate(id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
