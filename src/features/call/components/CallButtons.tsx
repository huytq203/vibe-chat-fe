'use client';

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useStartCall } from '@/features/call/hooks/useStartCall';
import type { CallPeer } from '@/features/call/types';

type CallButtonsProps = { conversationId: string; peer: CallPeer; disabled?: boolean };

/** 2 nút gọi audio/video — gắn vào ChatHeader (chỉ hội thoại DIRECT). */
export function CallButtons({ conversationId, peer, disabled }: CallButtonsProps) {
  const { start, busy } = useStartCall();

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Gọi thoại"
        aria-label="Gọi thoại"
        disabled={disabled || busy}
        onClick={() => start(conversationId, 'AUDIO', peer)}
      >
        <Phone className="h-[18px] w-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Gọi video"
        aria-label="Gọi video"
        disabled={disabled || busy}
        onClick={() => start(conversationId, 'VIDEO', peer)}
      >
        <Video className="h-[18px] w-[18px]" />
      </Button>
    </>
  );
}
