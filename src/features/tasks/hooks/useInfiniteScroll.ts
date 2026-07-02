'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface Options {
  /** Khung cuộn dùng làm root cho observer (null = viewport). */
  rootRef: RefObject<HTMLElement | null>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

/**
 * Trả về ref gắn vào phần tử sentinel ở cuối danh sách. Khi sentinel lọt vào
 * vùng nhìn của `rootRef` → gọi `onLoadMore` (lazy load). Root là khung cuộn cố
 * định (cao ~5 dòng) nên chỉ tải thêm khi người dùng thực sự cuộn xuống.
 */
export function useInfiniteScroll({
  rootRef,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: Options): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) onLoadMore();
      },
      { root: rootRef.current ?? null, rootMargin: '40px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootRef, hasNextPage, isFetchingNextPage, onLoadMore]);

  return sentinelRef;
}
