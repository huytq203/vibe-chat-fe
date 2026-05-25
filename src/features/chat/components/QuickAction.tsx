'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button/Button';

type QuickActionProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function QuickAction({ icon, label, active, onClick }: QuickActionProps) {
  return (
    <Button
      variant={active ? 'danger-outline' : 'ghost'}
      onClick={onClick}
      className="flex h-auto flex-col items-center gap-1 rounded-xl bg-muted px-1 py-2.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
    >
      {icon}
      <span className="text-[10.5px] font-medium">{label}</span>
    </Button>
  );
}
