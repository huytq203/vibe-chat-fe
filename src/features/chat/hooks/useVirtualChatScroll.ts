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
  scrollToMessage: (messageId: string, allMessages: Message[]) => void;
  handleScroll: () => void;
  setHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
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
  const lastIdRef = useRef<string | null>(null);
  const wasScrolledDownRef = useRef(false);
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

  const scrollToBottom = useCallback((): void => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollDown(false);
  }, [virtualizer, messages.length]);

  const scrollToMessage = useCallback(
    (messageId: string, allMessages: Message[]): void => {
      const idx = allMessages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
      setHighlightId(messageId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
    },
    [virtualizer],
  );

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrolledDown = distanceFromBottom > 240;
    if (wasScrolledDownRef.current && !isScrolledDown) onAtBottom?.();
    wasScrolledDownRef.current = isScrolledDown;
    setShowScrollDown(isScrolledDown);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, onAtBottom]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages, virtualizer]);

  useEffect(() => {
    if (!sendError) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [sendError, virtualizer, messages.length]);

  useEffect(() => {
    if (otherTypingCount === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [otherTypingCount, virtualizer, messages.length]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  return {
    scrollRef,
    virtualizer,
    showScrollDown,
    highlightId,
    scrollToBottom,
    scrollToMessage,
    handleScroll,
    setHighlightId,
  };
}
