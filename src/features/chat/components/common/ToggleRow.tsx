'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge/Badge';

type ToggleRowProps = {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Hiện badge "Sắp có" — dùng khi chờ BE bổ sung endpoint. */
  comingSoon?: boolean;
};

/**
 * Row cài đặt có switch toggle dạng pill.
 * disabled + comingSoon = UI skeleton chuẩn bị cho API chưa có.
 */
export function ToggleRow({
  icon, label, subtitle, checked, onChange, disabled, comingSoon,
}: ToggleRowProps) {
  const isInteractive = !disabled && !comingSoon;

  function handleClick() {
    if (!isInteractive) return;
    onChange?.(!checked);
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
        isInteractive ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-60',
      )}
      role="switch"
      aria-checked={checked}
      aria-disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] text-foreground">{label}</span>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {comingSoon && (
          <Badge variant="secondary" size="sm" className="text-[10px]">
            Sắp có
          </Badge>
        )}
        {/* Switch pill */}
        <div
          className={cn(
            'relative h-[22px] w-[40px] rounded-full transition-colors',
            checked ? 'bg-primary' : 'bg-border',
            !isInteractive && 'opacity-70',
          )}
        >
          <div
            className={cn(
              'absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-[20px]' : 'translate-x-[3px]',
            )}
          />
        </div>
      </div>
    </div>
  );
}
