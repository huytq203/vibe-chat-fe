'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Bot, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from '@/components/ui/sheet/Sheet';
import { AiChatHeader } from './AiChatHeader';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftModel, setDraftModel] = useState(settings.model);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(GEMINI_FREE_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } = useAutoResizeTextarea();

  useEffect(() => {
    setLoadingModels(true);
    void fetchGeminiModels().then((models) => {
      setModelOptions(models);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length]);

  useEffect(() => {
    resize();
  }, [input, resize]);

  useEffect(() => {
    focusInput();
  }, [session?.id, focusInput]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleOpenSettings() {
    setDraftModel(settings.model);
    setSettingsOpen((v) => !v);
  }

  function handleSaveSettings() {
    onSaveSettings({ model: draftModel });
    setSettingsOpen(false);
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
        settingsOpen={settingsOpen}
        onBack={onBack}
        onToggleSettings={handleOpenSettings}
        onModelChange={handleModelChange}
      />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent direction="right" size="sm">
          <SheetHeader>
            <SheetTitle>Cài đặt AI</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground">Model</span>
                {loadingModels && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <ComboBox
                options={modelOptions}
                value={draftModel}
                onValueChange={(v) => setDraftModel(Array.isArray(v) ? (v[0] ?? draftModel) : v)}
                autocomplete={false}
              />
            </div>
            <Button variant="solid" size="sm" className="w-full" onClick={handleSaveSettings}>
              Lưu
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {!session ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Bot className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chọn hoặc tạo cuộc trò chuyện mới</p>
          <Button variant="solid" size="sm" onClick={onCreateSession}>Tạo mới</Button>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full space-y-3 overflow-y-auto px-4 py-3"
          >
            {session.messages.map((msg, idx) => (
              <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
                  <span className="animate-pulse">Đang trả lời...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground shadow-md transition hover:bg-muted"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Xuống cuối
            </button>
          )}
        </div>
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
