'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CopyState = 'idle' | 'done' | 'error';

const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Sao chép',
  done: 'Đã sao chép',
  error: 'Trình duyệt chặn sao chép',
};

const COPY_ICON: Record<CopyState, typeof Copy> = {
  idle: Copy,
  done: Check,
  error: AlertCircle,
};

interface CopyTextResult {
  state: CopyState;
  label: string;
  Icon: typeof Copy;
  copy: () => Promise<void>;
}

/** Nhãn xác nhận tự tắt sau 1.6s để hàng hành động không kẹt ở trạng thái cũ. */
export function useCopyText(content: string): CopyTextResult {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return { state, label: COPY_LABEL[state], Icon: COPY_ICON[state], copy };
}

interface AiCopyButtonProps {
  content: string;
  className?: string;
}

/** Nút sao chép dùng chung, ẩn cho tới khi hover/focus. */
export function AiCopyButton({ content, className }: AiCopyButtonProps) {
  const { state, label, Icon, copy } = useCopyText(content);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={label}
      className={cn(
        'shrink-0 self-end rounded-lg border border-border/60 bg-sidebar/85 p-1.5 text-muted-foreground shadow-subtle backdrop-blur-md transition duration-150',
        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-60',
        state === 'error' && 'text-danger opacity-100',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
