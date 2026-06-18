'use client';

import { Bell, BellOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ReminderMetadata } from '@/features/my-store/types';

function formatRemindAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ReminderCardProps = {
  message: { metadata: Record<string, unknown> | null };
};

export function ReminderCard({ message }: ReminderCardProps) {
  const meta = message.metadata as ReminderMetadata;
  const isPast = new Date(meta.remindAt) < new Date();
  const isFired = meta.fired;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-2 max-w-sm',
        isFired
          ? 'border-muted bg-muted/40 opacity-75'
          : 'border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/30',
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'mt-0.5 rounded-full p-1.5',
            isFired ? 'bg-muted text-muted-foreground' : 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
          )}
        >
          {isFired ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium leading-snug', isFired && 'line-through text-muted-foreground')}>
            {meta.title}
          </p>
          {meta.note && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{meta.note}</p>
          )}
        </div>
      </div>
      <div className={cn('flex items-center gap-1.5 text-xs', isPast && !isFired ? 'text-red-500' : 'text-muted-foreground')}>
        <Clock className="h-3 w-3 shrink-0" />
        <span>{formatRemindAt(meta.remindAt)}</span>
        {isFired && <span className="ml-auto text-muted-foreground/60">Đã nhắc</span>}
        {isPast && !isFired && <span className="ml-auto font-medium">Quá hạn</span>}
      </div>
    </div>
  );
}
