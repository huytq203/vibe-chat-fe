'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';

interface AiMessageListProps {
  messages: AiMessage[];
  loading: boolean;
  error: string | null;
}

export function AiMessageList({ messages, loading, error }: AiMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.map((msg, idx) => (
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
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground shadow-md"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Xuống cuối
        </Button>
      )}
    </div>
  );
}
