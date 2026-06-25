'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/features/chat/types';

export interface VirtualChatScrollOptions {
  messages: Message[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  sendError: string | undefined;
  otherTypingCount: number;
  onAtBottom?: () => void;
}

export interface VirtualChatScrollResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  showScrollDown: boolean;
  highlightId: string | null;
  isScrollReady: boolean;
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
  handleScroll: () => void;
}

export function useVirtualChatScroll({
  messages,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  sendError,
  otherTypingCount,
  onAtBottom,
}: VirtualChatScrollOptions): VirtualChatScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const lastIdRef = useRef<string | null>(null);
  const keepAtBottomRef = useRef(true);
  const wasAtBottomRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  // Ẩn list cho đến khi measurements settle và đã scroll đúng đáy.
  // Tránh user thấy "lơ lửng → nhảy xuống" do estimateSize sai.
  const [isScrollReady, setIsScrollReady] = useState(false);

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const scrollToMessage = useCallback((messageId: string): void => {
    const idx = messagesRef.current.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
  }, [virtualizer]);

  const scrollToBottom = useCallback((): void => {
    keepAtBottomRef.current = true;
    virtualizer.scrollToIndex(messagesRef.current.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollDown(false);
  }, [virtualizer]);

  const handleScroll = useCallback((): void => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
      const awayFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 240;
      if (awayFromBottom) keepAtBottomRef.current = false;
      if (wasAtBottomRef.current && !awayFromBottom) onAtBottom?.();
      wasAtBottomRef.current = awayFromBottom;
      setShowScrollDown((prev) => (prev === awayFromBottom ? prev : awayFromBottom));
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, onAtBottom]);

  // Initial scroll: ẩn list, đợi 2 RAF (measurements settle), scroll đáy DOM, hiện list.
  // Chạy một lần duy nhất mỗi lần mount (key={conversationId} đảm bảo remount khi đổi conv).
  useEffect(() => {
    if (isScrollReady) return;
    if (messages.length === 0) return;
    lastIdRef.current = messages[messages.length - 1].id;

    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        setIsScrollReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Tin nhắn mới realtime
  useEffect(() => {
    if (!isScrollReady) return;
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    keepAtBottomRef.current = true;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages, virtualizer, isScrollReady]);

  useEffect(() => {
    if (!sendError) return;
    virtualizer.scrollToIndex(messagesRef.current.length - 1, { align: 'end' });
  }, [sendError, virtualizer]);

  useEffect(() => {
    if (otherTypingCount === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) virtualizer.scrollToIndex(messagesRef.current.length - 1, { align: 'end' });
  }, [otherTypingCount, virtualizer]);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { scrollRef, virtualizer, showScrollDown, highlightId, isScrollReady, scrollToBottom, scrollToMessage, handleScroll };
}
