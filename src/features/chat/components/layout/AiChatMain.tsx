'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { AiChatHeader } from './AiChatHeader';
import { AiMessageList } from './AiMessageList';
import type { AiSession, AiMessage } from '@/features/chat/hooks/useAiSessions';
import type { AiSettings } from '@/features/chat/hooks/useAiSettings';
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
  const [draftModel, setDraftModel] = useState(settings.model);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(GEMINI_FREE_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } = useAutoResizeTextarea();

  useEffect(() => {
    setLoadingModels(true);
    void fetchGeminiModels().then((models) => {
      setModelOptions(models);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => {
    resize();
  }, [input, resize]);

  useEffect(() => {
    focusInput();
  }, [session?.id, focusInput]);

  function handleSaveSettings() {
    onSaveSettings({ model: draftModel });
  }

  function handleModelChange(model: string | string[]) {
    const value = Array.isArray(model) ? (model[0] ?? settings.model) : model;
    onSaveSettings({ model: value });
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading || !session) return;
    const userMsg: AiMessage = { role: 'user', content: trimmed };
    onPushMessage(session.id, userMsg);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const content = await callGemini(settings.model, [...session.messages, userMsg]);
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

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            variant="filled"
            rows={1}
            className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
            placeholder="Nhắn tin với AI..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resize();
            }}
            onKeyDown={(e) => handleTextareaKeyDown(e, () => void handleSend(), loading)}
            disabled={!session}
          />
          <Button
            size="icon"
            variant="solid"
            onClick={() => void handleSend()}
            disabled={!input.trim() || !session}
            className="h-9 w-9 shrink-0"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
