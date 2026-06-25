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
  const wasAtBottomRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

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

  // Stable reference — reads messages from ref, no deps that change per-render
  const scrollToMessage = useCallback((messageId: string): void => {
    const idx = messagesRef.current.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
  }, [virtualizer]);

  // Stable reference — reads length from ref
  const scrollToBottom = useCallback((): void => {
    virtualizer.scrollToIndex(messagesRef.current.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollDown(false);
  }, [virtualizer]);

  // RAF-throttled to cap at 60fps; only setState when value actually changes
  const handleScroll = useCallback((): void => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
      const awayFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 240;
      if (wasAtBottomRef.current && !awayFromBottom) onAtBottom?.();
      wasAtBottomRef.current = awayFromBottom;
      setShowScrollDown((prev) => (prev === awayFromBottom ? prev : awayFromBottom));
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, onAtBottom]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages, virtualizer]);

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

  return { scrollRef, virtualizer, showScrollDown, highlightId, scrollToBottom, scrollToMessage, handleScroll };
}
