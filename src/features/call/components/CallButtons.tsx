'use client';

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useStartCall } from '@/features/call/hooks/useStartCall';
import type { CallDirectory, CallPeer } from '@/features/call/types';

type CallButtonsProps = {
  conversationId: string;
  /** Tiêu đề cuộc gọi: 1-1 = đối phương; group = tên nhóm. */
  peer: CallPeer;
  /** Group → render lưới, không giới hạn người tham gia. */
  isGroup?: boolean;
  /** userId → tên/avatar để gắn nhãn ô trong lưới group. */
  directory?: CallDirectory;
  disabled?: boolean;
};

/** 2 nút gọi audio/video — gắn vào ChatHeader (DIRECT và GROUP). */
export function CallButtons({
  conversationId,
  peer,
  isGroup = false,
  directory = {},
  disabled,
}: CallButtonsProps) {
  const { start, busy } = useStartCall();

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Gọi thoại"
        aria-label="Gọi thoại"
        disabled={disabled || busy}
        onClick={() => start(conversationId, 'AUDIO', peer, isGroup, directory)}
      >
        <Phone className="h-[18px] w-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Gọi video"
        aria-label="Gọi video"
        disabled={disabled || busy}
        onClick={() => start(conversationId, 'VIDEO', peer, isGroup, directory)}
      >
        <Video className="h-[18px] w-[18px]" />
      </Button>
    </>
  );
}
