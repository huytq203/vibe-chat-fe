'use client';

import { Phone, PhoneMissed, Video } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/features/chat/types';

export function CallMessageContent({ message }: { message: Message }) {
  const meta = (message.metadata ?? {}) as {
    callType?: 'AUDIO' | 'VIDEO';
    durationSec?: number;
    endReason?: string;
  };
  const isVideo = meta.callType === 'VIDEO';
  const isMissed =
    meta.endReason === 'MISSED' ||
    meta.endReason === 'CANCELLED' ||
    meta.endReason === 'DECLINED' ||
    (meta.durationSec ?? 0) === 0;
  const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
  const text =
    message.contentPreview ?? (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px]">
      <Icon className={cn('h-4 w-4 shrink-0', isMissed && 'text-destructive')} />
      <span>{text}</span>
    </span>
  );
}
