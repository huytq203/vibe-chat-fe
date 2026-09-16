'use client';

import { useMemo } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { extractUrls } from '@/lib/utils/url';
import { featureFlags } from '@/config/features';
import { useMessages, useSharedMessages } from './use-query';
import type { Attachment, Message, MessagesPage } from '@/features/chat/types';

export type SharedMedia = { key: string; message: Message; attachment: Attachment };
export type SharedLink = { key: string; url: string; messageId: string; createdAt: string };

/** Một tab Shared: lấy theo trang 40 tin, "Xem thêm" hết slice thì fetch trang kế. */
export type SharedSection<T> = {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  loadMore: () => void;
};

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
 * Gom ảnh/video, tệp và liên kết đã chia sẻ của một conversation.
 *
 * - `featureFlags.sharedContentApi` BẬT → mỗi loại gọi endpoint BE riêng, lấy theo trang 40 tin
 *   (`GET /conversations/:id/shared`, xem FRONTEND/20-shared-content.md).
 * - TẮT → fallback suy ra từ các trang message đã nạp trong cache.
 * - `activeTab` → chỉ fetch loại đang hiển thị; hai tab còn lại chờ đến khi user chuyển.
 *
 * "Xem thêm" mở rộng slice phía FE; khi hết slice thì fetch trang kế.
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
      const section = <T,>(
        q: ReturnType<typeof useSharedMessages>,
        pick: (all: ReturnType<typeof deriveSharedContent>) => T[],
      ): SharedSection<T> => ({
        items: pick(deriveSharedContent(flattenInfinite(q.data))),
        isLoading: q.isLoading,
        hasMore: Boolean(q.hasNextPage),
        isFetchingMore: q.isFetchingNextPage,
        loadMore: () => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        },
      });
      return {
        media: section(mediaQ, (all) => all.media),
        files: section(filesQ, (all) => all.files),
        links: section(linksQ, (all) => all.links),
      };
    }
    const all = deriveSharedContent(flattenInfinite(cacheData));
    return {
      media: {
        items: all.media,
        isLoading: false,
        hasMore: false,
        isFetchingMore: false,
        loadMore: () => {},
      },
      files: {
        items: all.files,
        isLoading: false,
        hasMore: false,
        isFetchingMore: false,
        loadMore: () => {},
      },
      links: {
        items: all.links,
        isLoading: false,
        hasMore: false,
        isFetchingMore: false,
        loadMore: () => {},
      },
    };
  }, [
    useApi,
    mediaQ.data,
    mediaQ.isLoading,
    mediaQ.hasNextPage,
    mediaQ.isFetchingNextPage,
    filesQ.data,
    filesQ.isLoading,
    filesQ.hasNextPage,
    filesQ.isFetchingNextPage,
    linksQ.data,
    linksQ.isLoading,
    linksQ.hasNextPage,
    linksQ.isFetchingNextPage,
    cacheData,
  ]);
}
