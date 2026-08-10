'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, Bot } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { TypingDots } from '@/features/chat/components/common/TypingDots';
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';
import { AiMessageContent } from './AiMessageContent';
import { AiAuthorLabel, AiMessageRow, type AiMessageVariant } from './AiMessageRow';

interface AiMessageListProps {
  messages: AiMessage[];
  loading: boolean;
  /** Chữ AI đang phát ra ở lượt hiện tại; `null` khi chưa có mẩu nào. */
  streaming?: string | null;
  variant?: AiMessageVariant;
  /** Trang /ai: chạy lại câu trả lời cuối. */
  onRegenerate?: () => void;
  /** Gửi lại tin ở vị trí `index` sau khi lượt trước hỏng. */
  onResend: (index: number) => void;
  /** Gỡ tin và đổ nội dung về ô nhập để sửa. */
  onEdit: (index: number) => void;
  onDiscard: (index: number) => void;
}

/** Cùng nhịp chấm với TypingBubble ở màn chat, hoà vào chất liệu của từng khung. */
function ThinkingIndicator({ variant }: { variant: AiMessageVariant }) {
  if (variant === 'page') {
    return (
      <div>
        <AiAuthorLabel />
        <div className="pl-9">
          <div className="w-fit rounded-2xl rounded-tl-md border bg-sidebar/85 px-3.5 py-2.5 text-muted-foreground shadow-subtle backdrop-blur-md">
            <TypingDots />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border bg-muted px-3.5 py-2.5 text-muted-foreground">
        <TypingDots />
      </div>
    </div>
  );
}

/**
 * Con trỏ nhấp nháy bám cuối đoạn chữ cuối cùng — dấu hiệu "còn đang gõ".
 * Dùng ::after của phần tử cuối để caret nằm ngay sau chữ, không rơi xuống dòng mới.
 */
const CARET =
  "[&>*:last-child]:after:ml-1 [&>*:last-child]:after:inline-block [&>*:last-child]:after:h-[0.9em] " +
  "[&>*:last-child]:after:w-[2px] [&>*:last-child]:after:translate-y-[0.12em] [&>*:last-child]:after:rounded-[1px] " +
  "[&>*:last-child]:after:bg-primary [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[''] " +
  '[&>*:last-child]:after:animate-blink motion-reduce:[&>*:last-child]:after:animate-none';

/** Câu trả lời đang chảy về: cùng khung với bong bóng AI đã hoàn tất, thêm caret. */
function StreamingReply({ content, variant }: { content: string; variant: AiMessageVariant }) {
  if (variant === 'page') {
    return (
      <div>
        <AiAuthorLabel />
        <div className="min-w-0 pl-9">
          <div className="rounded-2xl rounded-tl-md border bg-sidebar/85 px-4 py-3 text-foreground shadow-subtle backdrop-blur-md">
            <AiMessageContent
              content={content}
              className={cn('text-[14.5px] leading-[1.65]', CARET)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-accent px-3 py-2 text-[13px] leading-relaxed text-foreground">
        <AiMessageContent content={content} className={CARET} />
      </div>
    </div>
  );
}

export function AiMessageList({
  messages,
  loading,
  streaming = null,
  variant = 'window',
  onRegenerate,
  onResend,
  onEdit,
  onDiscard,
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

  // Chỉ báo đang soạn nằm ngoài vùng ảo hoá nên scrollToIndex không với tới nó —
  // đẩy hẳn xuống đáy container để nó luôn trong tầm nhìn như ở màn chat.
  useEffect(() => {
    if (!loading) return;
    const el = scrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  // Bám đáy khi chữ chảy về, nhưng CHỈ khi người dùng đang ở cuối — họ cuộn lên
  // đọc lại thì đừng giật màn hình xuống.
  useEffect(() => {
    if (streaming === null) return;
    const el = scrollRef.current;
    if (!el || el.scrollHeight - el.scrollTop - el.clientHeight > 160) return;
    el.scrollTop = el.scrollHeight;
  }, [streaming]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);

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
              // Chạy lại chỉ có nghĩa ở câu trả lời cuối. Cửa sổ nổi không có hàng
              // hành động cho tin bình thường, nhưng tin đứt dở thì vẫn cần "Gửi lại".
              const isLastAssistant =
                virtualItem.index === lastIndex && message.role === 'assistant';

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
                    index={virtualItem.index}
                    groupedWithPrev={groupedWithPrev}
                    groupedWithNext={groupedWithNext}
                    variant={variant}
                    busy={loading}
                    onRegenerate={isLastAssistant && !loading ? onRegenerate : undefined}
                    onResend={onResend}
                    onEdit={onEdit}
                    onDiscard={onDiscard}
                  />
                </div>
              );
            })}
          </div>

          {streaming !== null ? (
            <StreamingReply content={streaming} variant={variant} />
          ) : (
            loading && <ThinkingIndicator variant={variant} />
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
