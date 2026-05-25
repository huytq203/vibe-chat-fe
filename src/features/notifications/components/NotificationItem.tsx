'use client';

import { formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';
import type { Notification } from '../types';
import { getNotificationIcon } from '../utils';

type Props = {
  notification: Notification;
  onClick: (n: Notification) => void;
  onDelete: (id: string) => void;
};

export function NotificationItem({ notification, onClick, onDelete }: Props) {
  const time = formatDistanceToNowStrict(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(notification);
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !notification.isRead && 'bg-primary/5',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              'flex-1 truncate text-sm',
              !notification.isRead && 'font-semibold',
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">{time}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Xoá thông báo"
        title="Xoá thông báo"
        className="opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
