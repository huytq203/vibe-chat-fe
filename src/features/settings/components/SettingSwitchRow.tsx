'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type SettingSwitchRowProps = {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

/** Hàng cài đặt có switch dạng pill. */
export function SettingSwitchRow({
  icon, label, subtitle, checked, disabled, onChange,
}: SettingSwitchRowProps) {
  function handleClick() {
    if (disabled) return;
    onChange(!checked);
  }

  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted',
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      <div className={cn('relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')}>
        <div className={cn('absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[20px]' : 'translate-x-[3px]')} />
      </div>
    </div>
  );
}
