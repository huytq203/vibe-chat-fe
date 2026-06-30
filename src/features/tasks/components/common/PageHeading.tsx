import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeadingProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeading({ title, sub, actions, className }: PageHeadingProps) {
  return (
    <div className={cn('mb-6 flex items-start gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-2xl font-bold leading-tight text-foreground">{title}</h1>
        {sub && <p className="truncate text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
