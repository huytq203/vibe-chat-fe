'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { useEditMessage, useSendMessage } from './use-mutations';
import { useMessageEditStore } from '../stores/message-edit.store';
import { useMessageReplyStore } from '../stores/message-reply.store';
import {
  buildOptimisticAttachment,
  useAttachments,
  type AttachmentKind,
} from './useAttachments';
import {
  extractText,
  insertEmojiIntoEditor,
  placeCaretAtEnd,
  MAX_LENGTH,
  TYPING_STOP_DEBOUNCE_MS,
} from '../components/messages/composer-utils';
import type { MessageType } from '../types';

const KIND_TO_TYPE: Record<AttachmentKind, MessageType> = {
  image: 'IMAGE',
  video: 'VIDEO',
  file: 'FILE',
};

/**
 * Toàn bộ logic của ô soạn tin (gửi mới + sửa tin): editor contenteditable,
 * typing indicator, emoji, paste ảnh, submit/edit. Tách khỏi MessageInput để
 * component chỉ còn JSX (RULE.md §19 — component ≤ 200 dòng).
 */
export function useMessageComposer(conversationId: string, disabled?: boolean) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Hẹn giờ tự huỷ (giây) — null = tắt. Giữ giữa các tin trong cùng conv.
  const [selfDestructTtl, setSelfDestructTtl] = useState<number | null>(null);

  const send = useSendMessage();
  const editMut = useEditMessage();
  const editing = useMessageEditStore((s) => s.editing);
  const cancelEdit = useMessageEditStore((s) => s.cancelEdit);
  const isEditing = Boolean(editing) && editing?.conversationId === conversationId;

  const replyingState = useMessageReplyStore((s) => s.replying);
  const cancelReply = useMessageReplyStore((s) => s.cancelReply);
  // Reply chỉ áp dụng cho conv hiện tại và không khi đang sửa (loại trừ nhau).
  const replying =
    replyingState && replyingState.conversationId === conversationId && !isEditing
      ? replyingState
      : null;

  const { attachments, addFiles, remove, uploadAll, isUploading } = useAttachments();
  const typingStateRef = useRef<'start' | 'stop'>('stop');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefilledIdRef = useRef<string | null>(null);
  // Chặn submit chồng (double-click) → tránh gửi trùng tin media.
  const submittingRef = useRef(false);

  // Đổi conversation → dọn editor, dừng typing, huỷ phiên sửa đang dở.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
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

  // Focus editor ngay khi bắt đầu trả lời → user gõ được liền, không cần click input.
  useEffect(() => {
    if (replying) editorRef.current?.focus();
  }, [replying]);

  // Nạp nội dung gốc khi bắt đầu sửa; dọn editor khi thoát sửa.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isEditing && editing) {
      if (prefilledIdRef.current === editing.messageId) return;
      prefilledIdRef.current = editing.messageId;
      el.textContent = editing.text;
      setHasContent(editing.text.trim().length > 0);
      el.focus();
      placeCaretAtEnd(el);
    } else if (!isEditing && prefilledIdRef.current) {
      prefilledIdRef.current = null;
      el.innerHTML = '';
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

  function syncHasContent() {
    const el = editorRef.current;
    if (!el) return;
    setHasContent(extractText(el).trim().length > 0);
  }

  function exitEdit() {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = '';
      setHasContent(false);
    }
    prefilledIdRef.current = null;
    cancelEdit();
  }

  function saveEdit() {
    const el = editorRef.current;
    if (!el || !editing) return;
    const text = extractText(el).trim();
    // Không lưu rỗng / không đổi — muốn xoá nội dung thì dùng "Gỡ tin nhắn".
    if (!text || text === editing.text.trim()) {
      exitEdit();
      return;
    }
    editMut.mutate(
      { conversationId, messageId: editing.messageId, plaintext: text },
      { onSuccess: () => exitEdit() },
    );
  }

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    const has = extractText(el).trim().length > 0;
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

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      exitEdit();
      return;
    }
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Chèn <br> thay vì để browser tự bọc <div>.
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          syncHasContent();
        }
      } else {
        e.preventDefault();
        void submit();
      }
      return;
    }
    // Giới hạn độ dài với phím in được.
    if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
      const el = editorRef.current;
      if (el && extractText(el).length >= MAX_LENGTH) e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    // Dán ảnh từ clipboard → thêm vào tray đính kèm.
    const images = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) {
      e.preventDefault();
      addFiles(images, 'image');
      return;
    }
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (!plain) return;
    const el = editorRef.current;
    const currentLen = el ? extractText(el).length : 0;
    const truncated = plain.slice(0, MAX_LENGTH - currentLen);
    if (!truncated) return;
    // execCommand deprecated nhưng vẫn tương thích nhất cho contenteditable.
    document.execCommand('insertText', false, truncated);
    syncHasContent();
  }

  async function submit() {
    const el = editorRef.current;
    if (!el || disabled || submittingRef.current) return;
    if (isEditing) {
      saveEdit();
      return;
    }
    const text = extractText(el).trim();
    const hasAttachments = attachments.length > 0;
    if (!text && !hasAttachments) return;
    submittingRef.current = true;
    try {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      emitTyping('stop');

      // Không kèm file → gửi tin TEXT thuần.
      if (!hasAttachments) {
        el.innerHTML = '';
        setHasContent(false);
        send.mutate({
          conversationId,
          plaintext: text,
          clientNonce: crypto.randomUUID(),
          type: 'TEXT',
          replyToMessageId: replying?.messageId,
          selfDestructTtl: selfDestructTtl ?? undefined,
        });
        cancelReply();
        return;
      }

      // Có file → text trở thành CAPTION gắn vào tin media ĐẦU TIÊN (không tách
      // tin text riêng). BE cho phép plaintext + attachmentIds trong cùng 1 tin
      // (04-messages.md). Media đã upload ngầm → uploadAll chỉ chờ phần chưa xong.
      const uploaded = await uploadAll();
      // Còn file lỗi → CHẶN gửi, giữ nguyên editor + tray để user xoá file lỗi
      // rồi gửi lại (KHÔNG xoá caption, không gửi nửa vời).
      if (uploaded.some((a) => a.status === 'error')) {
        toast.error('Có tệp tải lên thất bại. Hãy xoá tệp lỗi rồi gửi lại.');
        return;
      }
      // Mọi file đã sẵn sàng → giờ mới dọn editor.
      el.innerHTML = '';
      setHasContent(false);
      let captionUsed = false;
      let replyUsed = false;
      uploaded.forEach((a) => {
        if (a.status !== 'done' || !a.media) return; // item lỗi → giữ lại tray để thử lại
        // Caption & reply chỉ gắn vào tin media đầu tiên gửi thành công.
        const caption = !captionUsed && text ? text : undefined;
        if (caption) captionUsed = true;
        const replyToMessageId = !replyUsed ? replying?.messageId : undefined;
        if (replyToMessageId) replyUsed = true;
        send.mutate({
          conversationId,
          // KHÔNG gửi plaintext rỗng cho media (theo 04-messages.md).
          plaintext: caption,
          clientNonce: crypto.randomUUID(),
          type: KIND_TO_TYPE[a.kind],
          attachmentIds: [a.media.id],
          replyToMessageId,
          selfDestructTtl: selfDestructTtl ?? undefined,
          previewUrl: a.kind === 'file' ? undefined : URL.createObjectURL(a.file),
          optimisticAttachment: buildOptimisticAttachment(a.media),
        });
        // Dọn tray nhưng GIỮ media (tin vừa gửi đang tham chiếu) → KHÔNG xoá storage.
        remove(a.id, false);
      });
      cancelReply();
    } finally {
      submittingRef.current = false;
    }
  }

  // Lưu vị trí caret ngay trước khi mở emoji picker.
  function handleEmojiButtonClick() {
    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setEmojiOpen((v) => !v);
  }

  function handleEmojiSelect(emoji: string) {
    const el = editorRef.current;
    if (!el) return;
    insertEmojiIntoEditor(el, emoji, savedRangeRef.current);
    savedRangeRef.current = null;
    syncHasContent();
  }

  return {
    editorRef,
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
    sendError: send.error,
    isSavingEdit: editMut.isPending,
    handleInput,
    handleKey,
    handlePaste,
    submit,
    exitEdit,
    handleEmojiButtonClick,
    handleEmojiSelect,
  };
}
