'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { messageApi } from '@/services/chat-message.api';
import type { Message, ShareContactTarget } from '@/features/chat/types';

/**
 * Chuyển tiếp một tin nhắn tới nhiều target (bạn bè → tạo direct; nhóm → gửi thẳng).
 * Tận dụng useSendMessage để gửi lại nội dung tương ứng với loại tin gốc.
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
      const conversationIds = await Promise.all(
        targets.map(async (target) =>
            target.type === 'friend'
              ? (await chatApi.createDirect(target.userId)).id
              : target.conversationId,
        ),
      );
      const result = await messageApi.forward(message.conversationId, message.id, conversationIds);
      if (result.failed.length === 0) toast.success('Đã chuyển tiếp');
      else if (result.success.length === 0) toast.error(result.failed[0]?.message ?? 'Không thể chuyển tiếp');
      else toast.warning(`Đã chuyển tiếp ${result.success.length}/${conversationIds.length}. ${result.failed[0]?.message ?? ''}`);
    } catch {
      toast.error('Không thể chuyển tiếp');
    } finally {
      setIsPending(false);
    }
  };

  return { forward, isPending };
}
