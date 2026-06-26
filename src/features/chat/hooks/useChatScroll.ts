'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface ChatScrollOptions {
  lastMessageId: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  onAtBottom?: () => void;
}

export interface ChatScrollResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  highlightId: string | null;
  showScrollDown: boolean;
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
  handleScroll: () => void;
}

const AWAY_THRESHOLD = 240;

export function useChatScroll({
  lastMessageId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onAtBottom,
}: ChatScrollOptions): ChatScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Scroll về đáy khi mount lần đầu (DOM height chính xác ngay, không cần virtualizer)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Khi có tin mới: scroll xuống nếu đang ở đáy
  useEffect(() => {
    if (!lastMessageId || lastMessageId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastMessageId;
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessageId]);

  // Khi load thêm trang cũ: giữ nguyên vị trí scroll (tránh nhảy lên đầu)
  useLayoutEffect(() => {
    if (isFetchingNextPage) {
      prevScrollHeightRef.current = scrollRef.current?.scrollHeight ?? 0;
      return;
    }
    if (!prevScrollHeightRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
    prevScrollHeightRef.current = 0;
  }, [isFetchingNextPage]);

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
    const away = el.scrollHeight - el.scrollTop - el.clientHeight > AWAY_THRESHOLD;
    if (atBottomRef.current && !away) onAtBottom?.();
    atBottomRef.current = !away;
    setShowScrollDown(away);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, onAtBottom]);

  const scrollToBottom = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const scrollToMessage = useCallback((messageId: string): void => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-msgid="${messageId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
  }, []);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  return { scrollRef, highlightId, showScrollDown, scrollToBottom, scrollToMessage, handleScroll };
}
