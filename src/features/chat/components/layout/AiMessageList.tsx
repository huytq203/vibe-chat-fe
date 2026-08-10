'use client';

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, ArrowDown, Bot } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';
import { AiMessageRow, type AiMessageVariant } from './AiMessageRow';

interface AiMessageListProps {
  messages: AiMessage[];
  loading: boolean;
  error: string | null;
  variant?: AiMessageVariant;
  /** Trang /ai: chạy lại câu trả lời cuối. */
  onRegenerate?: () => void;
}

function ThinkingIndicator({ variant }: { variant: AiMessageVariant }) {
  const dot = 'h-1.5 w-1.5 rounded-full bg-current animate-pulse';
  return (
    <div className={cn('flex justify-start', variant === 'page' && 'pl-9')}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12.5px]',
          variant === 'page'
            ? 'rounded-tl-md border bg-sidebar/85 text-muted-foreground shadow-subtle backdrop-blur-md'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <span className="flex items-center gap-1">
          <span className={dot} />
          <span className={cn(dot, '[animation-delay:180ms]')} />
          <span className={cn(dot, '[animation-delay:360ms]')} />
        </span>
        Halo AI đang soạn câu trả lời
      </div>
    </div>
  );
}

export function AiMessageList({
  messages,
  loading,
  error,
  variant = 'window',
  onRegenerate,
}: AiMessageListProps) {
  const isPage = variant === 'page';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (isPage ? 96 : 72),
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    if (messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages.length, virtualizer]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }

  function scrollToBottom() {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollBtn(false);
  }

  const lastIndex = messages.length - 1;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn('h-full overflow-y-auto', isPage ? 'px-1 py-2' : 'px-4 py-3')}
      >
        <div className={cn(isPage && 'mx-auto w-full max-w-[680px]')}>
          {messages.length === 0 && !loading && !isPage && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
              <Bot className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">Bắt đầu cuộc trò chuyện với AI</p>
            </div>
          )}

          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index];
              if (!message) return null;

              const groupedWithPrev = messages[virtualItem.index - 1]?.role === message.role;
              const groupedWithNext = messages[virtualItem.index + 1]?.role === message.role;
              const isLastAssistant =
                isPage && virtualItem.index === lastIndex && message.role === 'assistant';

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: groupedWithNext ? (isPage ? '8px' : '2px') : isPage ? '20px' : '10px',
                  }}
                >
                  <AiMessageRow
                    message={message}
                    groupedWithPrev={groupedWithPrev}
                    groupedWithNext={groupedWithNext}
                    variant={variant}
                    onRegenerate={isLastAssistant && !loading ? onRegenerate : undefined}
                  />
                </div>
              );
            })}
          </div>

          {loading && <ThinkingIndicator variant={variant} />}

          {error && (
            <div
              className={cn(
                'mt-2 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger',
                isPage && 'ml-9 backdrop-blur-md',
              )}
              role="alert"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              {isPage && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Thử lại
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showScrollBtn && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] shadow-subtle',
            isPage
              ? 'bg-sidebar/85 text-foreground backdrop-blur-md'
              : 'bg-background text-muted-foreground',
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Xuống cuối
        </Button>
      )}
    </div>
  );
}
