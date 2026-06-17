'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';

/**
 * Gửi danh thiếp của contactUserId tới hội thoại trực tiếp với friendId.
 * Flow: createDirect(friendId) → lấy conversationId → sendMessage CONTACT.
 */
export function useShareContactToFriend(contactUserId: string): {
  share: (friendId: string) => Promise<void>;
  isPending: boolean;
} {
  const [isPending, setIsPending] = useState(false);
  const sendMessage = useSendMessage();

  const share = async (friendId: string): Promise<void> => {
    setIsPending(true);
    try {
      const conv = await chatApi.createDirect(friendId);
      await sendMessage.mutateAsync({
        conversationId: conv.id,
        type: 'CONTACT',
        metadata: { contactUserId },
      });
      toast.success('Đã chia sẻ danh thiếp');
    } catch {
      toast.error('Không thể chia sẻ danh thiếp');
    } finally {
      setIsPending(false);
    }
  };

  return { share, isPending };
}
