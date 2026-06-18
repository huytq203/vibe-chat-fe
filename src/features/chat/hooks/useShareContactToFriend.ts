'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';
import type { ShareContactTarget } from '@/features/chat/types';

/**
 * Gửi danh thiếp của contactUserId tới nhiều target (friend hoặc group).
 * Friend: tạo direct conversation trước rồi gửi CONTACT.
 * Group: gửi CONTACT thẳng vào conversation đã có.
 */
export function useShareContactToFriend(contactUserId: string): {
  share: (targets: ShareContactTarget[]) => Promise<void>;
  isPending: boolean;
} {
  const [isPending, setIsPending] = useState(false);
  const sendMessage = useSendMessage();

  const share = async (targets: ShareContactTarget[]): Promise<void> => {
    if (targets.length === 0) return;
    setIsPending(true);
    try {
      await Promise.all(
        targets.map(async (target) => {
          const conversationId =
            target.type === 'friend'
              ? (await chatApi.createDirect(target.userId)).id
              : target.conversationId;
          await sendMessage.mutateAsync({
            conversationId,
            type: 'CONTACT',
            metadata: { contactUserId },
          });
        }),
      );
      toast.success('Đã chia sẻ danh thiếp');
    } catch {
      toast.error('Không thể chia sẻ danh thiếp');
    } finally {
      setIsPending(false);
    }
  };

  return { share, isPending };
}
