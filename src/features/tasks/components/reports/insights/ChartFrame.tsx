'use client';

import { useState, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

export const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

interface ChartFrameProps {
  height: number;
  children: ReactNode;
  className?: string;
}

export function ChartFrame({ height, children, className }: ChartFrameProps) {
  return (
    <div className={cn('w-full min-w-0', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface LegendItem {
  key: string;
  label: string;
  color: string;
}

interface SeriesLegendProps {
  items: readonly LegendItem[];
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export function SeriesLegend({ items, hidden, onToggle }: SeriesLegendProps) {
  return (
    <div aria-label="Chú giải biểu đồ" className="flex flex-wrap gap-1.5 px-2 pb-2">
      {items.map((item) => {
        const isHidden = hidden.has(item.key);
        return (
          <Button
            key={item.key}
            type="button"
            size="xs"
            variant="outline"
            aria-pressed={!isHidden}
            onClick={() => onToggle(item.key)}
            className={cn(
              'h-7 min-h-7 gap-1.5 border-border px-2 text-[10.5px] text-muted-foreground md:min-h-7',
              isHidden && 'opacity-45',
            )}
          >
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}

export function useSeriesVisibility() {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return { hidden, toggle };
}

interface TooltipEntry {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
  labelFormatter?: (label: string | number) => string;
}

export function ChartTooltip({ active, label, payload, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-subtle)]">
      {label !== undefined && (
        <p className="mb-1 font-semibold">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`${String(entry.name)}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums">{String(entry.value ?? '—')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatShortDate(value: string | number) {
  const textValue = String(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(textValue);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}`;
  const date = new Date(textValue);
  if (Number.isNaN(date.getTime())) return textValue;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
    .format(date)
    .replace('-', '/');
}
