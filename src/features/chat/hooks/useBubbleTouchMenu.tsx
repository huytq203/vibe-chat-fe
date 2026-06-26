'use client';

import { useState } from 'react';
import { useLongPress, type LongPressHandlers } from '@/lib/hooks/useLongPress';
import { useToggleReaction } from '@/features/chat/hooks/useReactions';
import { MessageActionDrawer } from '@/features/chat/components/messages/MessageActionDrawer';
import type { Message } from '@/features/chat/types';

type UseBubbleTouchMenuParams = {
  message: Message;
  meId: string | null;
  isMe: boolean;
  senderName?: string | null;
  canPin?: boolean;
  isPinned?: boolean;
  /** Bật gesture (= tin còn thao tác được). */
  enabled: boolean;
};

type BubbleTouchMenu = {
  /** Spread lên phần tử bubble: long-press mở menu, double-tap thả cảm xúc. */
  bubbleProps: LongPressHandlers;
  /** Drawer cảm xúc + action (chỉ render khi enabled). */
  drawer: React.ReactNode;
};

/**
 * Lớp tương tác cảm ứng cho bubble: long-press → mở drawer action, double-tap →
 * thả nhanh LIKE. Chuột bị bỏ qua nên desktop vẫn dùng hover như cũ.
 */
export function useBubbleTouchMenu({
  message, meId, isMe, senderName, canPin, isPinned, enabled,
}: UseBubbleTouchMenuParams): BubbleTouchMenu {
  const [open, setOpen] = useState(false);
  const toggleReaction = useToggleReaction(message.conversationId);

  const bubbleProps = useLongPress({
    enabled,
    onLongPress: () => setOpen(true),
    onDoubleTap: () => {
      const myReaction = message.myReaction ?? null;
      toggleReaction.mutate({
        messageId: message.id,
        type: myReaction ?? 'LIKE',
        current: myReaction,
      });
    },
  });

  const drawer = enabled ? (
    <MessageActionDrawer
      message={message}
      meId={meId}
      isMe={isMe}
      senderName={senderName}
      canPin={canPin}
      isPinned={isPinned}
      open={open}
      onOpenChange={setOpen}
    />
  ) : null;

  return { bubbleProps, drawer };
}
