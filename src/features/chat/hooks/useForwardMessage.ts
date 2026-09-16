'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { messageApi } from '@/services/chat-message.api';
import type { Message, ShareContactTarget } from '@/features/chat/types';

/**
 * Chuyển tiếp một tin nhắn tới nhiều target (bạn bè → BE tự tạo/mở direct; nhóm → gửi thẳng)
 * trong 1 request duy nhất.
 */
export function useForwardMessage(message: Message): {
  forward: (targets: ShareContactTarget[]) => Promise<void>;
  isPending: boolean;
} {
  const [isPending, setIsPending] = useState(false);

  const forward = async (targets: ShareContactTarget[]): Promise<void> => {
    if (targets.length === 0) return;
    setIsPending(true);
    try {
      // BE tự mở/tạo DIRECT cho từng userId → 1 request thay vì N+1.
      const conversationIds = targets.flatMap((target) =>
        target.type === 'friend' ? [] : [target.conversationId],
      );
      const userIds = targets.flatMap((target) =>
        target.type === 'friend' ? [target.userId] : [],
      );
      const result = await messageApi.forward(message.conversationId, message.id, {
        conversationIds,
        userIds,
      });
      const total = conversationIds.length + userIds.length;
      if (result.failed.length === 0) toast.success('Đã chuyển tiếp');
      else if (result.success.length === 0) toast.error(result.failed[0]?.message ?? 'Không thể chuyển tiếp');
      else toast.warning(`Đã chuyển tiếp ${result.success.length}/${total}. ${result.failed[0]?.message ?? ''}`);
    } catch {
      toast.error('Không thể chuyển tiếp');
    } finally {
      setIsPending(false);
    }
  };

  return { forward, isPending };
}
