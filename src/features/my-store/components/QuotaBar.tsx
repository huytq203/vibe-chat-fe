'use client';

import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useStoreQuota } from '@/features/my-store/hooks/use-query';

/** Thanh dung lượng chung của Kho của tôi (ảnh/video/file/folder dùng chung 5GB). */
export function QuotaBar() {
  const { data: quota, isLoading, isError } = useStoreQuota();

  const pct = quota ? Math.min(quota.percentUsed, 100) : 0;
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div className="border-t border-border/50 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {quota
            ? `${quota.usedFormatted} / ${quota.maxFormatted}`
            : isError
              ? 'Không tải được dung lượng'
              : 'Đang tải dung lượng…'}
        </span>
        {quota && (
          <span
            className={cn(
              'shrink-0 text-xs font-medium',
              isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-muted-foreground',
            )}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isLoading && !quota ? 'animate-pulse bg-muted-foreground/30' : '',
            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary',
          )}
          style={{ width: quota ? `${pct}%` : '100%' }}
        />
      </div>
    </div>
  );
}
