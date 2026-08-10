'use client';

import { useCallback, useEffect, useState } from 'react';
import { AiChatHeader } from './AiChatHeader';
import { AiMessageList } from './AiMessageList';
import { AiChatInput } from './AiChatInput';
import { AiWelcome } from './AiWelcome';
import type { AiMessage, AiSession } from '@/features/chat/hooks/useAiSessions';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { callGemini, type AiAttachment } from '@/lib/gemini';

interface AiChatMainProps {
  session: AiSession | null;
  onPushMessage: (sessionId: string, message: AiMessage) => void;
  onDropLastAssistant: (sessionId: string) => AiMessage[];
  onCreateSession: () => string;
  onDeleteSession: (id: string) => void;
  /** Mobile: quay lại danh sách lịch sử. */
  onBack?: () => void;
  /** Desktop: mở lại cột lịch sử đang thu gọn. */
  onExpandSidebar?: () => void;
}

export function AiChatMain({
  session,
  onPushMessage,
  onDropLastAssistant,
  onCreateSession,
  onDeleteSession,
  onBack,
  onExpandSidebar,
}: AiChatMainProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ref: textareaRef, resize, focusInput, handleKeyDown } = useAutoResizeTextarea();
  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [session?.id, focusInput]);

  const runCompletion = useCallback(
    async (sessionId: string, history: AiMessage[], files?: AiAttachment[]) => {
      setLoading(true);
      setError(null);
      try {
        const content = await callGemini(history, files);
        onPushMessage(sessionId, { role: 'assistant', content });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Halo AI chưa trả lời được, thử lại giúp bạn nhé');
      } finally {
        setLoading(false);
        focusInput();
      }
    },
    [onPushMessage, focusInput],
  );

  const sendPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if ((!trimmed && attachments.length === 0) || loading) return;

      const sessionId = session?.id ?? onCreateSession();
      const captured = attachments;
      const userMessage: AiMessage = {
        role: 'user',
        content: trimmed,
        attachments: captured.map(({ name, mimeType, size, previewUrl }) => ({
          name,
          mimeType,
          size,
          previewUrl,
        })),
      };

      onPushMessage(sessionId, userMessage);
      setInput('');
      clearAttachments();
      await runCompletion(sessionId, [...(session?.messages ?? []), userMessage], captured);
    },
    [attachments, loading, session, onCreateSession, onPushMessage, clearAttachments, runCompletion],
  );

  function handleRegenerate() {
    if (!session || loading) return;
    const history = onDropLastAssistant(session.id);
    if (history.length === 0) return;
    void runCompletion(session.id, history);
  }

  const messages = session?.messages ?? [];
  const showWelcome = messages.length === 0 && !loading;

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <AiChatHeader
        session={session}
        onBack={onBack}
        onExpandSidebar={onExpandSidebar}
        onCreateSession={onCreateSession}
        onDeleteSession={session ? () => onDeleteSession(session.id) : undefined}
      />

      {showWelcome ? (
        <AiWelcome onPick={(prompt) => void sendPrompt(prompt)} />
      ) : (
        <AiMessageList
          messages={messages}
          loading={loading}
          error={error}
          variant="page"
          onRegenerate={handleRegenerate}
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
        onSend={() => void sendPrompt(input)}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
      />
    </main>
  );
}
