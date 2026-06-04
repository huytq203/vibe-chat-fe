'use client';

import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { chatKeys } from '@/services/keys';
import { serverNow } from '@/lib/time/server-clock';
import type { Message, MessagesPage } from '../types';

/**
 * Tự ẩn tin nhắn tự huỷ khi tới `expireAt` (xem 15-edit-recall-selfdestruct.md).
 * Server xoá nền có thể trễ ~60s → KHÔNG chờ server, FE hẹn timer theo expireAt
 * rồi gỡ tin khỏi cache. `GET /messages` đã lọc sẵn tin quá hạn nên reload không
 * thấy lại — gỡ khỏi cache là đủ, không cần placeholder.
 */
export function useSelfDestruct(conversationId: string, messages: Message[]): void {
  const qc = useQueryClient();

  useEffect(() => {
    const key = chatKeys.messages(conversationId);

    function removeFromCache(messageId: string) {
      qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.filter((m) => m.id !== messageId),
          })),
        };
      });
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const m of messages) {
      if (!m.expireAt) continue;
      // Tin chưa gửi xong / gửi lỗi → CHƯA tính giờ huỷ (TTL kể từ lúc gửi thật).
      if (m.metadata?.optimistic === true || m.metadata?.failed === true) continue;
      // Đếm theo giờ server (bù lệch đồng hồ máy) → TTL ngắn (<1') chính xác.
      const ms = new Date(m.expireAt).getTime() - serverNow();
      if (ms <= 0) {
        removeFromCache(m.id); // đã quá hạn → ẩn luôn
      } else {
        timers.push(setTimeout(() => removeFromCache(m.id), ms));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [conversationId, messages, qc]);
}
