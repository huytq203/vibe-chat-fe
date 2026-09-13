'use client';

import { buildAiContext } from '@/features/ai/lib/build-ai-context';
import { useCallback, useEffect, useState } from 'react';
import { AiChatHeader } from './AiChatHeader';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import { AiWelcome } from './AiWelcome';
import type { AiSession, AiSessionActions, AiStreamFn } from '@/features/ai/types';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { aiApi } from '@/services/ai.api';

interface AiChatMainProps {
  session: AiSession;
  activeId: string | null;
  /** Đang tải danh sách/chi tiết hội thoại — không hiện màn chào để tránh nháy khi đổi hội thoại. */
  isLoading?: boolean;
  actions: AiSessionActions;
  remember: (conversationId: string) => void;
  onStartNew: () => void;
  onDeleteSession: (id: string) => void;
  /** Mobile: quay lại danh sách lịch sử. */
  onBack?: () => void;
  /** Desktop: mở lại cột lịch sử đang thu gọn. */
  onExpandSidebar?: () => void;
}

export function AiChatMain({
  session,
  activeId,
  isLoading = false,
  actions,
  remember,
  onStartNew,
  onDeleteSession,
  onBack,
  onExpandSidebar,
}: AiChatMainProps) {
  const [input, setInput] = useState('');

  const { ref: textareaRef, resize, focusInput, handleKeyDown } = useAutoResizeTextarea();
  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();
  const stream = useCallback<AiStreamFn>((messages, sentAttachments, options) =>
    aiApi.chatStream(
      messages,
      sentAttachments,
      { ...options, onDone: ({ conversationId }) => remember(conversationId) },
      buildAiContext({ app: 'CHAT' }),
      activeId ?? undefined,
    ), [activeId, remember]);
  const { loading, streaming, pendingUser, send, resend, regenerate, stop, recall, discard } =
    useAiConversation({
      streamKey: `chat:${session.id}`,
      session,
      actions,
      stream,
      onSettled: focusInput,
    });

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [session.id, focusInput]);

  // Dọn ô nhập ngay khi lượt gửi chắc chắn chạy — tránh xoá nhầm chữ đang gõ dở
  // nếu người dùng bấm Gửi lúc lượt trước còn chờ.
  async function handleSend(text: string) {
    const captured = attachments;
    if (loading || (!text.trim() && captured.length === 0)) return;
    setInput('');
    clearAttachments();
    await send(text, captured);
  }

  /** "Sửa": gỡ tin lỗi, đổ nguyên văn về ô nhập để chỉnh rồi gửi lại. */
  function handleEdit(index: number) {
    setInput(recall(index));
    focusInput();
  }

  const messages = session.messages;
  const showWelcome = messages.length === 0 && !loading && !isLoading;

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden md:gap-3">
      <AiChatHeader
        session={session}
        onBack={onBack}
        onExpandSidebar={onExpandSidebar}
        onCreateSession={onStartNew}
        onDeleteSession={activeId ? () => onDeleteSession(activeId) : undefined}
      />

      {showWelcome ? (
        <AiWelcome onPick={(prompt) => void handleSend(prompt)} />
      ) : (
        <AiMessageList
          messages={messages}
          loading={loading}
          pendingUser={pendingUser}
          streaming={streaming}
          variant="page"
          onRegenerate={regenerate}
          onResend={resend}
          onEdit={handleEdit}
          onDiscard={discard}
        />
      )}

      <AiChatInput
        input={input}
        loading={loading}
        attachments={attachments}
        attachmentError={attachmentError}
        textareaRef={textareaRef}
        variant="page"
        onInputChange={setInput}
        onResize={resize}
        onKeyDown={handleKeyDown}
        onSend={() => void handleSend(input)}
        onStop={stop}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
      />
    </main>
  );
}
