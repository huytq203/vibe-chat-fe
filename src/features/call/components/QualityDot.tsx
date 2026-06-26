'use client';

import { SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { QualityLevel } from '@/features/call/types';

const MAP: Record<QualityLevel, { Icon: typeof SignalHigh; color: string; label: string }> = {
  excellent: { Icon: SignalHigh, color: 'text-success', label: 'Kết nối tốt' },
  good: { Icon: SignalMedium, color: 'text-warning', label: 'Kết nối khá' },
  poor: { Icon: SignalLow, color: 'text-destructive', label: 'Kết nối kém' },
  unknown: { Icon: SignalLow, color: 'text-muted-foreground', label: 'Đang đo' },
};

/** Icon sóng thể hiện chất lượng kết nối của 1 participant. */
export function QualityDot({ quality }: { quality: QualityLevel }) {
  const { Icon, color, label } = MAP[quality];
  return (
    <span
      title={label}
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-md bg-black/40"
    >
      <Icon className={cn('h-3.5 w-3.5', color)} />
    </span>
  );
}
