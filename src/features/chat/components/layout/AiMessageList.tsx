'use client';

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, Bot, FileText, FileJson, File } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import type { AiMessage, AiAttachmentMeta } from '@/features/chat/hooks/useAiSessions';
import { AiMessageContent } from './AiMessageContent';

interface AiMessageListProps {
  messages: AiMessage[];
  loading: boolean;
  error: string | null;
}

function AttachmentDisplay({ attachment }: { attachment: AiAttachmentMeta }) {
  if (attachment.mimeType.startsWith('image/')) {
    if (attachment.previewUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="max-w-[200px] rounded-lg"
        />
      );
    }
    return <span className="text-[11px] opacity-60">[🖼 {attachment.name}]</span>;
  }

  const Icon =
    attachment.mimeType === 'application/json'
      ? FileJson
      : attachment.mimeType.startsWith('text/')
        ? FileText
        : File;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-0.5 text-[11px]">
      <Icon className="h-3 w-3" />
      <span className="max-w-[140px] truncate">{attachment.name}</span>
    </div>
  );
}

export function AiMessageList({ messages, loading, error }: AiMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
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
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }

  function scrollToBottom() {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollBtn(false);
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Bắt đầu cuộc trò chuyện với AI</p>
          </div>
        )}

        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const msg = messages[virtualItem.index];
            if (!msg) return null;
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
                  paddingBottom: '12px',
                }}
              >
                <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-1.5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {msg.attachments.map((a, i) => (
                              <AttachmentDisplay key={i} attachment={a} />
                            ))}
                          </div>
                        )}
                        {msg.content && (
                          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                        )}
                      </div>
                    ) : (
                      <AiMessageContent content={msg.content} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-start pt-1">
            <div className="rounded-2xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              <span className="animate-pulse">Đang trả lời...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>
        )}
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
