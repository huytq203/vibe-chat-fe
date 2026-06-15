'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

type ToolbarButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/** Nút nhỏ trên thanh định dạng — highlight khi mark đang bật (active). */
export function ToolbarButton({ icon, label, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        active && 'bg-primary/15 text-primary hover:text-primary',
      )}
    >
      {icon}
    </Button>
  );
}
