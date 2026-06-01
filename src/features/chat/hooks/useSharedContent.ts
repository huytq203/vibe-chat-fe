'use client';

import { useMemo } from 'react';
import { extractUrls } from '@/lib/utils/url';
import { useMessages } from './use-query';
import type { Attachment, Message } from '../types';

export type SharedMedia = { key: string; message: Message; attachment: Attachment };
export type SharedLink = { key: string; url: string; messageId: string; createdAt: string };

export type SharedContent = {
  media: SharedMedia[];
  files: SharedMedia[];
  links: SharedLink[];
};

/**
 * Gom ảnh/video, tệp và liên kết đã chia sẻ từ các trang message đã nạp trong
 * cache (useMessages). Không gọi API riêng — phản ánh đúng phần lịch sử đang xem.
 */
export function useSharedContent(conversationId: string | null): SharedContent {
  const { data } = useMessages(conversationId);

  return useMemo(() => {
    const messages = data?.pages.flatMap((p) => p.items) ?? [];
    const media: SharedMedia[] = [];
    const files: SharedMedia[] = [];
    const links: SharedLink[] = [];

    for (const m of messages) {
      if (m.isDeleted || m.encryptionType === 'E2E') continue;
      const att = m.attachments?.[0];
      if ((m.type === 'IMAGE' || m.type === 'VIDEO') && att) {
        media.push({ key: m.id, message: m, attachment: att });
      } else if ((m.type === 'FILE' || m.type === 'AUDIO') && att) {
        files.push({ key: m.id, message: m, attachment: att });
      }
      for (const url of extractUrls(m.plaintext)) {
        links.push({ key: `${m.id}:${url}`, url, messageId: m.id, createdAt: m.createdAt });
      }
    }

    return { media, files, links };
  }, [data]);
}
