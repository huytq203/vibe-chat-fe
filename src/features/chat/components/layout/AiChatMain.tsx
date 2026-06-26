'use client';

import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { AiChatHeader } from './AiChatHeader';
import { AiMessageList } from './AiMessageList';
import { AiChatInput } from './AiChatInput';
import type { AiSession, AiMessage } from '@/features/chat/hooks/useAiSessions';
import type { AiSettings } from '@/features/chat/hooks/useAiSettings';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { callGemini, fetchGeminiModels, GEMINI_FREE_MODELS } from '@/lib/gemini';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';

type ModelOption = { label: string; value: string };

type Props = {
  session: AiSession | null;
  settings: AiSettings;
  onSaveSettings: (s: AiSettings) => void;
  onPushMessage: (sessionId: string, msg: AiMessage) => void;
  onBack: () => void;
  onCreateSession: () => void;
};

export function AiChatMain({
  session,
  settings,
  onSaveSettings,
  onPushMessage,
  onBack,
  onCreateSession,
}: Props) {
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(GEMINI_FREE_MODELS);
  const [loadingModels, setLoadingModels] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  useEffect(() => {
    // loadingModels khởi tạo true → chỉ cần set false sau khi fetch xong (setState async
    // trong .then là hợp lệ, tránh setState đồng bộ trong effect).
    void fetchGeminiModels().then((models) => {
      setModelOptions(models);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [session?.id, focusInput]);

  function handleModelChange(model: string | string[]) {
    const value = Array.isArray(model) ? (model[0] ?? settings.model) : model;
    onSaveSettings({ model: value });
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || loading || !session) return;

    const capturedAttachments = attachments;
    const userMsg: AiMessage = {
      role: 'user',
      content: trimmed,
      attachments: capturedAttachments.map(({ name, mimeType, size, previewUrl }) => ({
        name, mimeType, size, previewUrl,
      })),
    };
    onPushMessage(session.id, userMsg);
    setInput('');
    clearAttachments();
    setLoading(true);
    setError(null);
    try {
      const content = await callGemini(settings.model, [...session.messages, userMsg], capturedAttachments);
      onPushMessage(session.id, { role: 'assistant', content });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <AiChatHeader
        model={settings.model}
        modelOptions={loadingModels ? [{ label: 'Đang tải...', value: settings.model }] : modelOptions}
        onBack={onBack}
        onModelChange={handleModelChange}
      />

      {!session ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Bot className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chọn hoặc tạo cuộc trò chuyện mới</p>
          <Button variant="solid" size="sm" onClick={onCreateSession}>Tạo mới</Button>
        </div>
      ) : (
        <AiMessageList messages={session.messages} loading={loading} error={error} />
      )}

      <AiChatInput
        input={input}
        loading={loading}
        attachments={attachments}
        attachmentError={attachmentError}
        textareaRef={textareaRef}
        disabled={!session}
        onInputChange={setInput}
        onResize={resize}
        onKeyDown={handleTextareaKeyDown}
        onSend={() => void handleSend()}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
      />
    </main>
  );
}
