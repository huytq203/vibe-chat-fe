import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PanelProps {
  title: string;
  /** Nội dung phụ bên phải tiêu đề: đếm, nút, filter… */
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Khối nội dung trong khu Work. Nền dùng `background` chứ không phải `muted`:
 * token `--sidebar` chính là `muted`, nên well muted đặt trên card sẽ trùng màu nền.
 */
export function Panel({ title, action, className, bodyClassName, children }: PanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col rounded-2xl border border-border bg-background p-2 shadow-micro',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-2 pb-2 pt-1">
        <h2 className="text-[12.5px] font-semibold tracking-tight text-foreground">{title}</h2>
        {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
      </header>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

interface PanelStateProps {
  children: ReactNode;
  tone?: 'muted' | 'danger';
}

/** Dòng trạng thái ngắn (loading/error/empty) dùng chung trong Panel. */
export function PanelState({ children, tone = 'muted' }: PanelStateProps) {
  return (
    <p
      className={cn(
        'px-2 py-6 text-center text-[12.5px]',
        tone === 'danger' ? 'text-danger' : 'text-muted-foreground',
      )}
    >
      {children}
    </p>
  );
}
