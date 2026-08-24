'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

const sizeStyles = {
  sm: {
    container: 'gap-1.5 px-3 py-6',
    icon: 'h-10 w-10',
    iconGraphic: 'h-5 w-5',
    message: 'text-xs',
    action: 'pt-1',
    button: 'xs' as const,
  },
  md: {
    container: 'gap-2 px-6 py-14',
    icon: 'h-16 w-16',
    iconGraphic: 'h-6 w-6',
    message: 'text-sm',
    action: 'pt-2',
    button: 'sm' as const,
  },
} as const;

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  size?: 'sm' | 'md';
}

export function ErrorState({
  message = 'Không tải được dữ liệu',
  onRetry,
  size = 'md',
}: ErrorStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container
      )}
      role="alert"
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-danger/10 text-danger',
          styles.icon
        )}
      >
        <AlertCircle aria-hidden="true" className={styles.iconGraphic} />
      </div>
      <div className={cn('font-semibold', styles.message)}>{message}</div>
      {onRetry && (
        <div className={styles.action}>
          {/* Thử lại là thao tác an toàn, không phá huỷ. Màu danger dành cho icon và
              thông điệp; tô đỏ affordance duy nhất sẽ đọc thành "bấm vào là mất gì đó". */}
          <Button onClick={onRetry} size={styles.button} variant="outline">
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}
