'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { callGemini, GEMINI_FREE_MODELS } from '@/lib/gemini';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MODEL_STORAGE_KEY = 'ai-panel-model';

function loadModel(): string {
  if (typeof window === 'undefined') return GEMINI_FREE_MODELS[0].value;
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? GEMINI_FREE_MODELS[0].value;
}

export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(loadModel);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } = useAutoResizeTextarea();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    resize();
  }, [input, resize]);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  function handleModelChange(value: string | string[]) {
    const next = Array.isArray(value) ? (value[0] ?? model) : value;
    setModel(next);
    try { localStorage.setItem(MODEL_STORAGE_KEY, next); } catch { /* ignore */ }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const content = await callGemini(model, nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 flex-col gap-2 px-4 pb-3 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">Halo AI</span>
        </div>
        <ComboBox
          options={GEMINI_FREE_MODELS}
          value={model}
          onValueChange={handleModelChange}
          autocomplete={false}
        />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Bắt đầu cuộc trò chuyện với AI</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
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

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            variant="filled"
            rows={1}
            className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
            placeholder="Nhắn tin với AI..."
            value={input}
            onChange={(e) => { setInput(e.target.value); resize(); }}
            onKeyDown={(e) => handleTextareaKeyDown(e, () => void handleSend(), loading)}
          />
          <Button
            size="icon"
            variant="solid"
            onClick={() => void handleSend()}
            disabled={!input.trim()}
            className="h-9 w-9 shrink-0"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
