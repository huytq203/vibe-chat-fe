'use client';

import { useQuery } from '@tanstack/react-query';
import { diffHtmlBlocks } from '@/features/notes/lib/html-block-diff';
import { notionKeys } from '@/services/keys';
import { exportApi } from '@/services/notion-export.api';
import { versionsApi } from '@/services/notion.api';

/** Bản trước lấy từ snapshot BEFORE_AI, bản sau là HTML hiện tại của trang. */
export function useAiChangeReview(pageId: string, versionId: string) {
  return useQuery({
    queryKey: notionKeys.aiChangeReview(pageId, versionId),
    queryFn: async () => {
      const [before, afterHtml] = await Promise.all([
        versionsApi.detail(versionId),
        exportApi.html(pageId),
      ]);
      return {
        diff: diffHtmlBlocks(before.html, afterHtml),
        previousTitle: before.title,
      };
    },
    enabled: Boolean(pageId && versionId),
    // Trang có thể vừa được sửa tiếp, mỗi lần mở phải so với nội dung mới nhất.
    staleTime: 0,
    gcTime: 0,
  });
}
