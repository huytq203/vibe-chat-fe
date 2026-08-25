'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { Breadcrumb, Page, PageDetail } from '@/features/notes/types';
import type { YDoc } from '@/lib/collab';
import { notionKeys } from '@/services/keys';

export const TITLE_CACHE_SYNC_DELAY_MS = 300;

type YTitle = ReturnType<YDoc['getText']>;
export type TitlePage = Pick<Page, 'id' | 'workspaceId' | 'parentId'>;

function updatePageTitle<T extends { id: string; title: string }>(
  items: T[] | undefined,
  pageId: string,
  title: string,
): T[] | undefined {
  if (!items?.some((item) => item.id === pageId && item.title !== title)) return items;
  return items.map((item) => item.id === pageId ? { ...item, title } : item);
}

export function useYTitleValue(title: YTitle, page: TitlePage): string {
  const queryClient = useQueryClient();
  const subscribe = useCallback((onChange: () => void) => {
    title.observe(onChange);
    return () => title.unobserve(onChange);
  }, [title]);
  const getSnapshot = useCallback(() => title.toString(), [title]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => '');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      queryClient.setQueryData<Page[]>(
        notionKeys.pageChildren(page.workspaceId, page.parentId),
        (pages) => updatePageTitle(pages, page.id, value),
      );
      queryClient.setQueryData<Breadcrumb>(
        notionKeys.breadcrumb(page.id),
        (items) => updatePageTitle(items, page.id, value),
      );
      queryClient.setQueryData<PageDetail>(notionKeys.page(page.id), (current) => {
        if (!current || current.title === value) return current;
        return { ...current, title: value };
      });
    }, TITLE_CACHE_SYNC_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [page.id, page.parentId, page.workspaceId, queryClient, value]);

  return value;
}
