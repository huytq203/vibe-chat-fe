'use client';

import { useEffect } from 'react';
import { useConversations } from '@/features/chat/hooks/use-query';
import { applyFaviconBadge, applyTitleBadge } from '@/features/notifications/favicon-badge';

/**
 * Đồng bộ tổng số tin nhắn chưa đọc (sum conversation.unreadCount) lên tab trình duyệt:
 * favicon kèm chấm đỏ + số, và prefix "(N)" vào title.
 * Tin nhắn dùng unreadCount của từng hội thoại, không dùng notification count.
 * Title bị Next ghi đè khi đổi route → observer trên <title> để áp lại prefix.
 */
export function useFaviconBadge() {
  const { data: conversations = [] } = useConversations();
  const count = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

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
