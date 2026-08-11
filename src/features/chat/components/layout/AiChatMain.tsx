'use client';

import { useEffect, useState } from 'react';
import { AiChatHeader } from './AiChatHeader';
import { AiMessageList } from './AiMessageList';
import { AiChatInput } from './AiChatInput';
import { AiWelcome } from './AiWelcome';
import type { AiSession, AiSessionActions } from '@/features/chat/hooks/useAiSessions';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAiConversation } from '@/features/chat/hooks/useAiConversation';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';

interface AiChatMainProps {
  session: AiSession | null;
  actions: AiSessionActions;
  onDeleteSession: (id: string) => void;
  /** Mobile: quay lại danh sách lịch sử. */
  onBack?: () => void;
  /** Desktop: mở lại cột lịch sử đang thu gọn. */
  onExpandSidebar?: () => void;
}

export function AiChatMain({
  session,
  actions,
  onDeleteSession,
  onBack,
  onExpandSidebar,
}: AiChatMainProps) {
  const [input, setInput] = useState('');

  const { ref: textareaRef, resize, focusInput, handleKeyDown } = useAutoResizeTextarea();
  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();
  const { loading, streaming, send, resend, regenerate, stop, recall, discard } =
    useAiConversation({ session, actions, onSettled: focusInput });

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [session?.id, focusInput]);

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

  const messages = session?.messages ?? [];
  const showWelcome = messages.length === 0 && !loading;

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden md:gap-3">
      <AiChatHeader
        session={session}
        onBack={onBack}
        onExpandSidebar={onExpandSidebar}
        onCreateSession={actions.createSession}
        onDeleteSession={session ? () => onDeleteSession(session.id) : undefined}
      />

      {showWelcome ? (
        <AiWelcome onPick={(prompt) => void handleSend(prompt)} />
      ) : (
        <AiMessageList
          messages={messages}
          loading={loading}
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
