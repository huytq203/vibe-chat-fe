'use client';

import { useQuery } from '@tanstack/react-query';
import { createMarkdownDiff } from '@/features/notes/lib/markdown-diff';
import { notionKeys } from '@/services/keys';
import { exportApi } from '@/services/notion-export.api';
import { versionsApi } from '@/services/notion.api';

export function useAiPageDiff(pageId: string, versionId: string, enabled: boolean) {
  return useQuery({
    queryKey: notionKeys.aiPageDiff(pageId, versionId),
    queryFn: async () => {
      const [before, after] = await Promise.all([
        versionsApi.detail(versionId),
        exportApi.markdown(pageId),
      ]);
      return {
        segments: createMarkdownDiff(before.markdown, after),
        previousTitle: before.title,
      };
    },
    enabled: Boolean(pageId && versionId) && enabled,
  });
}
