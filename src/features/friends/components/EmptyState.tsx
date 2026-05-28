import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  hint?: string;
};

export function EmptyState({ icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/40 text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
