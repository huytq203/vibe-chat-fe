'use client';

import { useMemo } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { extractUrls } from '@/lib/utils/url';
import { featureFlags } from '@/config/features';
import { useMessages, useSharedMessages } from './use-query';
import type { Attachment, Message, MessagesPage } from '@/features/chat/types';

export type SharedMedia = { key: string; message: Message; attachment: Attachment };
export type SharedLink = { key: string; url: string; messageId: string; createdAt: string };

/** Một tab Shared: danh sách item ĐẦY ĐỦ (lấy hết 1 lần) + cờ đang tải. Mở rộng hiển thị
 *  ("Xem thêm") xử lý phía FE bằng slicing, không gọi BE thêm. */
export type SharedSection<T> = { items: T[]; isLoading: boolean };

export type SharedContent = {
  media: SharedSection<SharedMedia>;
  files: SharedSection<SharedMedia>;
  links: SharedSection<SharedLink>;
};

function flattenInfinite(data: InfiniteData<MessagesPage> | undefined): Message[] {
  return data?.pages.flatMap((p) => p.items) ?? [];
}

/** Phân loại danh sách message thành ảnh/video, tệp và liên kết đã chia sẻ. */
function deriveSharedContent(messages: Message[]): {
  media: SharedMedia[];
  files: SharedMedia[];
  links: SharedLink[];
} {
  const media: SharedMedia[] = [];
  const files: SharedMedia[] = [];
  const links: SharedLink[] = [];

  for (const m of messages) {
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
}

export type SharedTab = 'media' | 'files' | 'links';

/**
 * Gom ảnh/video, tệp và liên kết đã chia sẻ của một conversation — lấy ĐỦ toàn bộ.
 *
 * - `featureFlags.sharedContentApi` BẬT → mỗi loại gọi endpoint BE riêng một lần KHÔNG `limit`
 *   (`GET /conversations/:id/shared`, xem FRONTEND/20-shared-content.md) → nhận hết.
 * - TẮT → fallback suy ra từ các trang message đã nạp trong cache.
 * - `activeTab` → chỉ fetch loại đang hiển thị; hai tab còn lại chờ đến khi user chuyển.
 *
 * "Xem thêm" trong UI chỉ mở rộng số item hiển thị (slicing FE), KHÔNG fetch thêm.
 */
export function useSharedContent(conversationId: string | null, activeTab: SharedTab = 'media'): SharedContent {
  const useApi = featureFlags.sharedContentApi;

  const mediaQ = useSharedMessages(conversationId, 'MEDIA', useApi && activeTab === 'media');
  const filesQ = useSharedMessages(conversationId, 'FILE', useApi && activeTab === 'files');
  const linksQ = useSharedMessages(conversationId, 'LINK', useApi && activeTab === 'links');

  // Fallback chỉ tải message cache khi không dùng API (tránh fetch thừa).
  const { data: cacheData } = useMessages(useApi ? null : conversationId);

  return useMemo(() => {
    if (useApi) {
      return {
        media: { items: deriveSharedContent(mediaQ.data?.items ?? []).media, isLoading: mediaQ.isLoading },
        files: { items: deriveSharedContent(filesQ.data?.items ?? []).files, isLoading: filesQ.isLoading },
        links: { items: deriveSharedContent(linksQ.data?.items ?? []).links, isLoading: linksQ.isLoading },
      };
    }
    const all = deriveSharedContent(flattenInfinite(cacheData));
    return {
      media: { items: all.media, isLoading: false },
      files: { items: all.files, isLoading: false },
      links: { items: all.links, isLoading: false },
    };
  }, [
    useApi,
    mediaQ.data,
    mediaQ.isLoading,
    filesQ.data,
    filesQ.isLoading,
    linksQ.data,
    linksQ.isLoading,
    cacheData,
  ]);
}
