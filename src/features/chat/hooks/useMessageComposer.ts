'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { messageToJson } from '@/lib/editor/serializer';
import { useEditMessage, useSendMessage } from './use-mutations';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import {
  buildOptimisticAttachment,
  useAttachments,
  type AttachmentKind,
} from './useAttachments';
import { TYPING_STOP_DEBOUNCE_MS } from '@/features/chat/components/messages/composer-utils';
import { useTiptapMention } from './useTiptapMention';
import type { EditorHandle } from '@/features/chat/components/messages/RichMessageEditor';
import type { MessageType } from '@/features/chat/types';

const KIND_TO_TYPE: Record<AttachmentKind, MessageType> = {
  image: 'IMAGE',
  video: 'VIDEO',
  file: 'FILE',
};

/**
 * Toàn bộ logic của ô soạn tin (gửi mới + sửa tin): điều phối editor Tiptap
 * (RichMessageEditor) qua ref handle, typing indicator, emoji, paste ảnh,
 * submit/edit kèm richText. Tách khỏi MessageInput để component chỉ còn JSX.
 */
export function useMessageComposer(conversationId: string, disabled?: boolean) {
  const editorRef = useRef<EditorHandle>(null);
  const [hasContent, setHasContent] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selfDestructTtl, setSelfDestructTtl] = useState<number | null>(null);

  const mention = useTiptapMention(conversationId);
  const send = useSendMessage();
  const editMut = useEditMessage();
  const editing = useMessageEditStore((s) => s.editing);
  const cancelEdit = useMessageEditStore((s) => s.cancelEdit);
  const isEditing = Boolean(editing) && editing?.conversationId === conversationId;

  const replyingState = useMessageReplyStore((s) => s.replying);
  const cancelReply = useMessageReplyStore((s) => s.cancelReply);
  const replying =
    replyingState && replyingState.conversationId === conversationId && !isEditing
      ? replyingState
      : null;

  const { attachments, addFiles, remove, uploadAll, isUploading } = useAttachments();
  const typingStateRef = useRef<'start' | 'stop'>('stop');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefilledIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  // Đổi conversation → dọn editor, dừng typing, huỷ phiên sửa/trả lời đang dở.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.clear();
      setHasContent(false);
      setSelfDestructTtl(null);
    }
    prefilledIdRef.current = null;
    useMessageEditStore.getState().cancelEdit();
    useMessageReplyStore.getState().cancelReply();
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (typingStateRef.current === 'start') {
        const socket = getSocket(apiAuth.getToken());
        if (socket?.connected) socket.emit('typing', { conversationId, state: 'stop' });
        typingStateRef.current = 'stop';
      }
    };
  }, [conversationId]);

  // Focus editor khi bắt đầu trả lời → user gõ được liền.
  useEffect(() => {
    if (replying) editorRef.current?.focus();
  }, [replying]);

  // Nạp lại nội dung + định dạng gốc khi bắt đầu sửa; dọn editor khi thoát sửa.
  useEffect(() => {
    if (isEditing && editing) {
      if (prefilledIdRef.current === editing.messageId) return;
      prefilledIdRef.current = editing.messageId;
      const rt = editing.richText ?? { v: 1 as const, marks: [], blocks: [] };
      editorRef.current?.editor?.commands.setContent(
        messageToJson(editing.text, editing.mentions ?? [], rt),
      );
      editorRef.current?.focus();
      setHasContent(editing.text.trim().length > 0);
    } else if (!isEditing && prefilledIdRef.current) {
      prefilledIdRef.current = null;
      editorRef.current?.clear();
      setHasContent(false);
    }
  }, [isEditing, editing]);

  function emitTyping(state: 'start' | 'stop') {
    if (typingStateRef.current === state) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket?.connected) {
      typingStateRef.current = state;
      return;
    }
    socket.emit('typing', { conversationId, state });
    typingStateRef.current = state;
  }

  function scheduleStop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => emitTyping('stop'), TYPING_STOP_DEBOUNCE_MS);
  }

  function exitEdit() {
    editorRef.current?.clear();
    setHasContent(false);
    prefilledIdRef.current = null;
    cancelEdit();
  }

  function saveEdit() {
    if (!editorRef.current || !editing) return;
    const { plaintext, richText } = editorRef.current.serialize();
    const text = plaintext.trim();
    const metadata = richText ? { richText } : undefined;
    const sameText = text === editing.text.trim();
    const sameFormat =
      JSON.stringify(richText ?? null) === JSON.stringify(editing.richText ?? null);
    // Không lưu rỗng / không đổi gì (text + định dạng) — muốn xoá thì dùng "Gỡ tin nhắn".
    if (!text || (sameText && sameFormat)) {
      exitEdit();
      return;
    }
    editMut.mutate(
      { conversationId, messageId: editing.messageId, plaintext, metadata },
      { onSuccess: () => exitEdit() },
    );
  }

  /** RichMessageEditor onUpdate → cập nhật hasContent + typing indicator. */
  function handleUpdate(has: boolean) {
    setHasContent(has);
    if (disabled || isEditing) return;
    if (has) {
      emitTyping('start');
      scheduleStop();
    } else {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      emitTyping('stop');
    }
  }

  /** Paste ảnh → thêm vào tray đính kèm (chặn default của editor). */
  function handlePasteFiles(files: File[]): boolean {
    addFiles(files, 'image');
    return true;
  }

  async function submit() {
    if (!editorRef.current || disabled || submittingRef.current) return;
    if (isEditing) {
      saveEdit();
      return;
    }
    const { plaintext, mentions: rawMentions, richText } = editorRef.current.serialize();
    const hasText = plaintext.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if (!hasText && !hasAttachments) return;
    // Offset của mentions/richText tính theo plaintext nguyên bản → KHÔNG trim.
    const mentions = mention.expandMentions(rawMentions);
    const metadata = richText ? { richText } : undefined;

    submittingRef.current = true;
    try {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      emitTyping('stop');

      if (!hasAttachments) {
        editorRef.current.clear();
        setHasContent(false);
        send.mutate({
          conversationId,
          plaintext,
          clientNonce: crypto.randomUUID(),
          type: 'TEXT',
          replyToMessageId: replying?.messageId,
          mentions: mentions.length ? mentions : undefined,
          metadata,
          selfDestructTtl: selfDestructTtl ?? undefined,
        });
        cancelReply();
        return;
      }

      // Có file → text thành CAPTION gắn vào tin media ĐẦU TIÊN (xem 04-messages.md).
      const uploaded = await uploadAll();
      if (uploaded.some((a) => a.status === 'error')) {
        toast.error('Có tệp tải lên thất bại. Hãy xoá tệp lỗi rồi gửi lại.');
        return;
      }
      editorRef.current.clear();
      setHasContent(false);
      let captionUsed = false;
      let replyUsed = false;
      uploaded.forEach((a) => {
        if (a.status !== 'done' || !a.media) return;
        const caption = !captionUsed && hasText ? plaintext : undefined;
        const captionMentions = caption && mentions.length ? mentions : undefined;
        const captionMetadata = caption ? metadata : undefined;
        if (caption) captionUsed = true;
        const replyToMessageId = !replyUsed ? replying?.messageId : undefined;
        if (replyToMessageId) replyUsed = true;
        send.mutate({
          conversationId,
          plaintext: caption,
          clientNonce: crypto.randomUUID(),
          type: KIND_TO_TYPE[a.kind],
          attachmentIds: [a.media.id],
          mentions: captionMentions,
          metadata: captionMetadata,
          replyToMessageId,
          selfDestructTtl: selfDestructTtl ?? undefined,
          previewUrl: a.kind === 'file' ? undefined : URL.createObjectURL(a.file),
          optimisticAttachment: buildOptimisticAttachment(a.media),
        });
        remove(a.id, false);
      });
      cancelReply();
    } finally {
      submittingRef.current = false;
    }
  }

  function handleEmojiButtonClick() {
    setEmojiOpen((v) => !v);
  }

  function handleEmojiSelect(emoji: string) {
    editorRef.current?.insertText(emoji);
    setEmojiOpen(false);
  }

  return {
    editorRef,
    mention,
    hasContent,
    emojiOpen,
    setEmojiOpen,
    isEditing,
    replying,
    cancelReply,
    selfDestructTtl,
    setSelfDestructTtl,
    attachments,
    addFiles,
    remove,
    isUploading,
    isSavingEdit: editMut.isPending,
    handleUpdate,
    handlePasteFiles,
    submit,
    exitEdit,
    handleEmojiButtonClick,
    handleEmojiSelect,
  };
}
