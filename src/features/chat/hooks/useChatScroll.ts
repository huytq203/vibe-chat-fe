'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface ChatScrollOptions {
  lastMessageId: string | null;
  /** Tin cuối do chính mình gửi → luôn scroll xuống đáy (bỏ qua gate atBottom). */
  lastMessageIsOwn?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  onAtBottom?: () => void;
}

export interface ChatScrollResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  highlightId: string | null;
  showScrollDown: boolean;
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
  handleScroll: () => void;
}

const AWAY_THRESHOLD = 240;

export function useChatScroll({
  lastMessageId,
  lastMessageIsOwn = false,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onAtBottom,
}: ChatScrollOptions): ChatScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchNextPageRef = useRef(fetchNextPage);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Đồng bộ ref ngoài render để observer/handler luôn gọi bản fetchNextPage mới nhất
  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  // Trigger load thêm trang cũ bằng IntersectionObserver.
  // Effect chạy lại khi isFetchingNextPage chuyển true→false: observer được recreate
  // và ngay lập tức fire initial check — nếu sentinel vẫn visible (container chưa
  // đủ overflow) thì fetchNextPage() tiếp tục được gọi cho đến khi có thanh cuộn.
  useEffect(() => {
    const container = scrollRef.current;
    const sentinel = topSentinelRef.current;
    if (!container || !sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPageRef.current();
        }
      },
      { root: container, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  // Recreate observer sau mỗi lần fetch xong hoặc hasNextPage thay đổi
  }, [hasNextPage, isFetchingNextPage]);

  // Scroll về đáy khi mount lần đầu
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Khi có tin mới: scroll xuống nếu đang ở đáy — hoặc luôn scroll nếu là tin mình vừa gửi.
  useEffect(() => {
    if (!lastMessageId || lastMessageId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastMessageId;
    if (!atBottomRef.current && !lastMessageIsOwn) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessageId, lastMessageIsOwn]);

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
    // Fallback cho trường hợp IntersectionObserver không fire (bị throttle, browser cũ)
    if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 150) {
      void fetchNextPageRef.current();
    }
    const away = el.scrollHeight - el.scrollTop - el.clientHeight > AWAY_THRESHOLD;
    if (atBottomRef.current && !away) onAtBottom?.();
    atBottomRef.current = !away;
    setShowScrollDown(away);
  }, [hasNextPage, isFetchingNextPage, onAtBottom]);

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

  return { scrollRef, topSentinelRef, highlightId, showScrollDown, scrollToBottom, scrollToMessage, handleScroll };
}
