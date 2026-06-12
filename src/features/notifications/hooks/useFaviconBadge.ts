'use client';

import { useEffect } from 'react';
import { applyFaviconBadge, applyTitleBadge } from '@/features/notifications/favicon-badge';
import { useUnreadCount } from './use-query';

/**
 * Đồng bộ số thông báo chưa đọc lên tab trình duyệt: favicon kèm chấm đỏ + số,
 * và prefix "(N)" vào title. Title bị Next ghi đè khi đổi route → observer
 * trên <title> để áp lại prefix.
 */
export function useFaviconBadge() {
  const { data } = useUnreadCount();
  const count = data?.unreadCount ?? 0;

  useEffect(() => {
    applyTitleBadge(count);
    void applyFaviconBadge(count);

    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    // applyTitleBadge idempotent → set lại title giống hệt sẽ không trigger loop.
    const observer = new MutationObserver(() => applyTitleBadge(count));
    observer.observe(titleEl, { childList: true });
    return () => observer.disconnect();
  }, [count]);

  // Rời app (unmount layout) → trả favicon/title gốc.
  useEffect(
    () => () => {
      applyTitleBadge(0);
      void applyFaviconBadge(0);
    },
    [],
  );
}
