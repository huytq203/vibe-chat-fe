import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Page } from '@/features/notes/types';
import { YDoc } from '@/lib/collab';
import { notionKeys } from '@/services/keys';

import { TITLE_CACHE_SYNC_DELAY_MS, useYTitleValue } from './use-title';

function buildPage(id: string, title: string): Page {
  return {
    id,
    workspaceId: 'workspace-1',
    parentId: 'parent-1',
    path: `.parent-1.${id}.`,
    depth: 1,
    sortKey: 'a0',
    title,
    icon: null,
    coverUrl: null,
    createdBy: 'user-1',
    lastEditedBy: null,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('đồng bộ tiêu đề Y.Doc vào cache ghi chú', () => {
  it('cập nhật tên đúng trang trong pageChildren sau khi Y.Doc đổi title', () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const page = buildPage('page-1', 'Tên cũ');
    const sibling = buildPage('page-2', 'Trang bên cạnh');
    const childrenKey = notionKeys.pageChildren(page.workspaceId, page.parentId);
    queryClient.setQueryData<Page[]>(childrenKey, [page, sibling]);
    queryClient.setQueryData(notionKeys.breadcrumb(page.id), [
      { id: 'parent-1', title: 'Trang cha', icon: null },
      { id: page.id, title: page.title, icon: null },
    ]);
    queryClient.setQueryData(notionKeys.page(page.id), { ...page, myRole: 'EDIT' });
    const doc = new YDoc();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    renderHook(() => useYTitleValue(doc.getText('title'), page), { wrapper: Wrapper });

    act(() => doc.getText('title').insert(0, 'Tên mới'));
    expect(queryClient.getQueryData<Page[]>(childrenKey)?.[0].title).toBe('Tên cũ');

    act(() => vi.advanceTimersByTime(TITLE_CACHE_SYNC_DELAY_MS));

    expect(queryClient.getQueryData<Page[]>(childrenKey)?.map(({ id, title }) => ({
      id,
      title,
    }))).toEqual([
      { id: 'page-1', title: 'Tên mới' },
      { id: 'page-2', title: 'Trang bên cạnh' },
    ]);
    expect(queryClient.getQueryData<{ id: string; title: string }[]>(
      notionKeys.breadcrumb(page.id),
    )?.at(-1)?.title).toBe('Tên mới');
    expect(queryClient.getQueryData<Page>(notionKeys.page(page.id))?.title).toBe('Tên mới');
  });
});
