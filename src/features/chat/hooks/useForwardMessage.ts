'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';
import { readContactCard } from '@/features/chat/types';
import type { Message, SendMessageInput, ShareContactTarget } from '@/features/chat/types';

const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;

type ForwardPayload = Pick<SendMessageInput, 'type' | 'plaintext' | 'attachmentIds' | 'metadata'>;

/** Dựng payload gửi lại theo loại tin gốc (media giữ attachment, CONTACT giữ danh thiếp). */
function buildForwardPayload(message: Message): ForwardPayload {
  if ((MEDIA_TYPES as readonly string[]).includes(message.type)) {
    return {
      type: message.type,
      attachmentIds: message.attachments.map((a) => a.mediaId),
      plaintext: message.plaintext ?? undefined,
    };
  }
  const contact = readContactCard(message);
  if (contact) {
    return { type: 'CONTACT', metadata: { contactUserId: contact.contactUserId } };
  }
  return { type: 'TEXT', plaintext: message.plaintext ?? message.contentPreview ?? '' };
}

/**
 * Chuyển tiếp một tin nhắn tới nhiều target (bạn bè → tạo direct; nhóm → gửi thẳng).
 * Tận dụng useSendMessage để gửi lại nội dung tương ứng với loại tin gốc.
 */
export function useForwardMessage(message: Message): {
  forward: (targets: ShareContactTarget[]) => Promise<void>;
  isPending: boolean;
} {
  const [isPending, setIsPending] = useState(false);
  const sendMessage = useSendMessage();

  const forward = async (targets: ShareContactTarget[]): Promise<void> => {
    if (targets.length === 0) return;
    setIsPending(true);
    try {
      const payload = buildForwardPayload(message);
      await Promise.all(
        targets.map(async (target) => {
          const conversationId =
            target.type === 'friend'
              ? (await chatApi.createDirect(target.userId)).id
              : target.conversationId;
          await sendMessage.mutateAsync({ conversationId, ...payload });
        }),
      );
      toast.success('Đã chuyển tiếp');
    } catch {
      toast.error('Không thể chuyển tiếp');
    } finally {
      setIsPending(false);
    }
  };

  return { forward, isPending };
}
