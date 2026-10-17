'use client';

import type { ResizeHandleProps as HookHandleProps } from '@/lib/hooks/useResizable';
import { cn } from '@/lib/utils/cn';

interface ResizeHandleProps {
  handleProps: HookHandleProps;
  isResizing: boolean;
  /** Cạnh của panel mà tay nắm nằm trên. */
  edge: 'left' | 'top';
  /** Chỉ dành cho trình đọc màn hình; con trỏ đổi hình đã đủ báo hiệu cho người dùng chuột. */
  label: string;
  className?: string;
}

/**
 * Vùng bắt kéo 8px nằm trong mép panel, chừa 20px hai đầu để không đè lên góc bo.
 * Chỉ hiện một viên thuốc ngắn giữa cạnh khi hover/focus; đang kéo thì dài ra và đổi sang primary.
 */
export function ResizeHandle({ handleProps, isResizing, edge, label, className }: ResizeHandleProps) {
  const isVertical = edge === 'left';
  return (
    <div
      {...handleProps}
      aria-label={label}
      data-resizing={isResizing || undefined}
      className={cn(
        'group absolute z-10 touch-none select-none outline-none',
        isVertical
          ? 'inset-y-5 left-0 w-2 cursor-col-resize'
          : 'inset-x-5 top-0 h-2 cursor-row-resize',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute rounded-full bg-muted-foreground/45 opacity-0',
          'transition-[opacity,height,width,background-color] duration-150 ease-out motion-reduce:transition-none',
          'group-hover:opacity-100 group-hover:delay-150 group-focus-visible:opacity-100',
          'group-focus-visible:bg-primary group-data-[resizing]:opacity-100 group-data-[resizing]:bg-primary',
          isVertical
            ? 'left-0.5 top-1/2 h-10 w-1 -translate-y-1/2 group-data-[resizing]:h-14'
            : 'left-1/2 top-0.5 h-1 w-10 -translate-x-1/2 group-data-[resizing]:w-14',
        )}
      />
    </div>
  );
}
