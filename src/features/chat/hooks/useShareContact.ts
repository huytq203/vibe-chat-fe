'use client';

import { useCallback } from 'react';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';

/** Gửi danh thiếp (type=CONTACT) của 1 user vào hội thoại hiện tại. */
export function useShareContact(conversationId: string) {
  const sendMessage = useSendMessage();
  return useCallback(
    (contactUserId: string) => {
      sendMessage.mutate({ conversationId, type: 'CONTACT', metadata: { contactUserId } });
    },
    [conversationId, sendMessage],
  );
}
