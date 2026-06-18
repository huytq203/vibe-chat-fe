'use client';

import { useCallback } from 'react';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';
import type { ContactSnapshot } from '@/features/chat/components/contact/ContactPickerDialog';

/** Gửi danh thiếp (type=CONTACT) của 1 user vào hội thoại hiện tại. */
export function useShareContact(conversationId: string) {
  const sendMessage = useSendMessage();
  return useCallback(
    (contact: ContactSnapshot) => {
      sendMessage.mutate({
        conversationId,
        type: 'CONTACT',
        metadata: {
          contactUserId: contact.id,
          // Snapshot cục bộ để readContactCard hiển thị đúng khi optimistic và WS echo
          // chưa có avatarUrl từ BE (enrichContactCards chỉ chạy lúc REST getMessages).
          contact: {
            contactUserId: contact.id,
            displayName: contact.displayName,
            username: contact.username,
            avatarUrl: contact.avatarUrl,
          },
        },
      });
    },
    [conversationId, sendMessage],
  );
}
