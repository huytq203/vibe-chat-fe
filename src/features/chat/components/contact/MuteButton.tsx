'use client';

import { Bell, BellOff } from 'lucide-react';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import { QuickAction } from '@/features/chat/components/common/QuickAction';
import { useMuteConversation } from '@/features/chat/hooks/use-mutations';
import type { Conversation } from '@/features/chat/types';

const HOUR = 60 * 60_000;
const PRESETS: { label: string; ms: number | null }[] = [
  { label: '30 phút', ms: 30 * 60_000 },
  { label: '1 giờ', ms: HOUR },
  { label: '8 giờ', ms: 8 * HOUR },
  { label: '1 tuần', ms: 7 * 24 * HOUR },
  { label: 'Đến khi mở lại', ms: null },
];

/** Mốc ISO tự bật lại (ở module scope để Date.now() không nằm trong body component). */
function muteUntilIso(ms: number | null): string | null {
  return ms ? new Date(Date.now() + ms).toISOString() : null;
}

export function MuteButton({ conversation }: { conversation: Conversation }) {
  const isMuted = Boolean(conversation.isMuted);
  const muteMut = useMuteConversation();

  function applyMute(ms: number | null) {
    muteMut.mutate({ conversationId: conversation.id, isMuted: true, mutedUntil: muteUntilIso(ms) });
  }

  if (isMuted) {
    return (
      <QuickAction
        icon={<BellOff className="h-[18px] w-[18px]" />}
        label="Bỏ tắt"
        active
        onClick={() => muteMut.mutate({ conversationId: conversation.id, isMuted: false })}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger>
        <QuickAction icon={<Bell className="h-[18px] w-[18px]" />} label="Tắt t.báo" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" showArrow={false} className="w-44 p-1">
        <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          Tắt thông báo trong
        </div>
        {PRESETS.map((p) => (
          <PopoverClose
            key={p.label}
            onClick={() => applyMute(p.ms)}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-foreground transition-colors hover:bg-muted"
          >
            {p.label}
          </PopoverClose>
        ))}
      </PopoverContent>
    </Popover>
  );
}
