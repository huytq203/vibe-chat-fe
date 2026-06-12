'use client';
import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type StepProgressProps = { labels: readonly string[]; current: number };

export function StepProgress({ labels, current }: StepProgressProps) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center">
        {labels.map((label, i) => (
          <Fragment key={label}>
            {i > 0 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors duration-300',
                  i <= current ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300',
                i < current && 'bg-primary text-primary-foreground',
                i === current && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                i > current && 'border-2 border-border bg-muted text-muted-foreground',
              )}
            >
              {i < current ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </div>
          </Fragment>
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <span
            key={label}
            className={cn(
              'flex-1 whitespace-nowrap text-center text-[10.5px] font-semibold transition-colors',
              i === current
                ? 'text-primary'
                : i < current
                  ? 'text-primary/70'
                  : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
