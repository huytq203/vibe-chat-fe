'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Message } from '@/features/chat/types';
import { canEditMessage, getMessageSnippet } from '@/features/chat/utils';
import {
  useDeleteMessage,
  usePinMessage,
  useUnpinMessage,
} from '@/features/chat/hooks/use-mutations';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import { useForwardMessage } from '@/features/chat/hooks/useForwardMessage';
import { getRichText } from '@/features/chat/components/messages/rich-text-utils';

type UseMessageActionsParams = {
  message: Message;
  meId: string | null;
  isMe: boolean;
  senderName?: string | null;
  isPinned?: boolean;
};

/**
 * Logic dùng chung cho mọi action tin nhắn (Trả lời / Chuyển tiếp / Ghim / Sửa /
 * Sao chép / Gỡ). Tiêu thụ bởi thanh hover desktop (MessageActions) và drawer mobile
 * (MessageActionDrawer) để không lặp lại mutation + state dialog.
 */
export function useMessageActions({
  message,
  meId,
  isMe,
  senderName,
  isPinned,
}: UseMessageActionsParams) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const { forward } = useForwardMessage(message);
  const startEdit = useMessageEditStore((s) => s.startEdit);
  const startReply = useMessageReplyStore((s) => s.startReply);
  const deleteMut = useDeleteMessage();
  const pinMut = usePinMessage();
  const unpinMut = useUnpinMessage();

  const canEdit = isMe && canEditMessage(message, meId);
  const canCopy = message.type === 'TEXT';
  const resolvedText = message.plaintext ?? message.contentPreview ?? '';

  function handleTogglePin() {
    const vars = { conversationId: message.conversationId, messageId: message.id };
    if (isPinned) unpinMut.mutate(vars);
    else pinMut.mutate(vars);
  }

  function handleCopy() {
    if (!resolvedText || !navigator.clipboard) return;
    void navigator.clipboard.writeText(resolvedText).then(
      () => toast.success('Đã sao chép'),
      () => toast.error('Không sao chép được'),
    );
  }

  function handleReply() {
    useMessageEditStore.getState().cancelEdit();
    startReply({
      conversationId: message.conversationId,
      messageId: message.id,
      senderName: isMe ? 'Bạn' : senderName || 'Người dùng',
      snippet: getMessageSnippet(message),
      type: message.type,
    });
  }

  function handleEdit() {
    useMessageReplyStore.getState().cancelReply();
    startEdit({
      conversationId: message.conversationId,
      messageId: message.id,
      text: resolvedText,
      mentions: message.mentions,
      richText: getRichText(message.metadata) ?? undefined,
    });
  }

  function handleDelete() {
    deleteMut.mutate({
      conversationId: message.conversationId,
      messageId: message.id,
    });
    setConfirmOpen(false);
  }

  return {
    confirmOpen,
    setConfirmOpen,
    reportOpen,
    setReportOpen,
    forwardOpen,
    setForwardOpen,
    forward,
    deleteMut,
    canEdit,
    canCopy,
    handleTogglePin,
    handleCopy,
    handleReply,
    handleEdit,
    handleDelete,
  };
}

export type MessageActionsApi = ReturnType<typeof useMessageActions>;
