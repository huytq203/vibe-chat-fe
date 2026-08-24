import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const sizeStyles = {
  sm: {
    container: 'gap-1.5 px-3 py-6',
    icon: 'h-10 w-10',
    title: 'text-xs',
    hint: 'text-xs',
    action: 'pt-1',
  },
  md: {
    container: 'gap-2 px-6 py-14',
    icon: 'h-16 w-16',
    title: 'text-sm',
    hint: 'text-xs',
    action: 'pt-2',
  },
} as const;

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  size?: 'sm' | 'md';
}

export function EmptyState({ icon, title, hint, action, size = 'md' }: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-accent/40 text-muted-foreground',
          styles.icon
        )}
      >
        {icon}
      </div>
      <div className={cn('font-semibold', styles.title)}>{title}</div>
      {hint && <div className={cn('text-muted-foreground', styles.hint)}>{hint}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
