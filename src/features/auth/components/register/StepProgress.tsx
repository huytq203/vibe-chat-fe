'use client';
import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type StepProgressProps = { labels: readonly string[]; current: number };

/**
 * Mỗi bước là một cột (vòng tròn + nhãn) nên nhãn luôn nằm đúng dưới tâm vòng tròn.
 * Đường nối là phần tử `flex-1` giữa các cột, đẩy xuống `mt-[15px]` để trùng tâm vòng tròn (h-8).
 */
export function StepProgress({ labels, current }: StepProgressProps) {
  return (
    <div className="mb-5 flex items-start" aria-label="Tiến trình đăng ký">
      {labels.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && (
            <div
              className={cn(
                'mt-[15px] h-0.5 flex-1 rounded-full transition-colors duration-300',
                i <= current ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
          <div
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            aria-current={i === current ? 'step' : undefined}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300',
                i < current && 'bg-primary text-primary-foreground',
                i === current && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                i > current && 'border-2 border-border bg-muted text-muted-foreground',
              )}
            >
              {i < current ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={cn(
                'whitespace-nowrap text-[10.5px] font-semibold leading-none transition-colors',
                i === current
                  ? 'text-primary'
                  : i < current
                    ? 'text-primary/70'
                    : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
