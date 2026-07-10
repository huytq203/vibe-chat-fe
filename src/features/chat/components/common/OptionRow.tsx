'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

type OptionRowProps = {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
};

export function OptionRow({ icon, label, danger, onClick }: OptionRowProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'h-auto w-full justify-start gap-2 px-2 py-2 text-[13px] font-normal',
        danger
          ? 'text-danger hover:bg-danger/10 hover:text-danger'
          : 'text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
