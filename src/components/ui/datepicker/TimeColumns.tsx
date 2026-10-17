'use client';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import type { DatePickerLabels, TimeFormat, TimeParts } from './datePickerUtils';

const ITEM_HEIGHT = 32;
const range = (n: number) => Array.from({ length: n }, (_, i) => String(i).padStart(2, '0'));

interface TimeColumnProps {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ label, values, value, onChange }) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const mounted = React.useRef(false);

  React.useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const top = Math.max(0, values.indexOf(value) * ITEM_HEIGHT - 8);
    if (mounted.current && typeof el.scrollTo === 'function') el.scrollTo({ top, behavior: 'smooth' });
    else el.scrollTop = top;
    mounted.current = true;
  }, [value, values]);

  return (
    <div className="flex w-16 flex-col border-l border-border first:border-l-0">
      <span className="pb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        className="h-[280px] overflow-y-auto overscroll-contain px-1.5 [scrollbar-width:thin]"
      >
        {values.map((v) => (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={v === value}
            onClick={() => onChange(v)}
            style={{ height: ITEM_HEIGHT }}
            className={cn(
              'block w-full rounded-lg font-mono text-sm tabular-nums transition-colors hover:bg-primary/10',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
              v === value && 'bg-primary/10 font-bold text-primary',
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};

interface TimeColumnsProps {
  parts: TimeParts;
  onChange: (parts: TimeParts) => void;
  timeFormat: TimeFormat;
  labels: Pick<DatePickerLabels, 'hour' | 'minute' | 'second'>;
  className?: string;
}

/** Hour / minute / second scroll columns (antd style). */
export const TimeColumns: React.FC<TimeColumnsProps> = ({ parts, onChange, timeFormat, labels, className }) => (
  <div className={cn('flex shrink-0 border-l border-border pt-3.5 first:border-l-0', className)}>
    <TimeColumn label={labels.hour} values={range(24)} value={parts.h} onChange={(h) => onChange({ ...parts, h })} />
    {timeFormat !== 'HH' && (
      <TimeColumn label={labels.minute} values={range(60)} value={parts.m} onChange={(m) => onChange({ ...parts, m })} />
    )}
    {timeFormat === 'HH:mm:ss' && (
      <TimeColumn label={labels.second} values={range(60)} value={parts.s} onChange={(s) => onChange({ ...parts, s })} />
    )}
  </div>
);
TimeColumns.displayName = 'TimeColumns';
