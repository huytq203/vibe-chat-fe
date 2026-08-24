import type { ReactNode } from 'react';
import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { notionKeys } from '@/services/keys';
import { useCreatePage, useMovePage, useRemovePage } from './use-mutations';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const NOTION_URL = 'http://localhost:3007';
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: '2026-08-24T00:00:00.000Z',
  });
}

function buildPage(overrides: { id: string; parentId: string | null }) {
  return {
    id: overrides.id,
    workspaceId: 'ws-1',
    parentId: overrides.parentId,
    path: `/root/${overrides.id}`,
    depth: 1,
    sortKey: 'a0',
    title: 'Trang kiểm thử',
    icon: null,
    coverUrl: null,
    createdBy: 'user-1',
    lastEditedBy: null,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { Wrapper, invalidateSpy };
}

function getInvalidatedKeys(
  invalidateSpy: ReturnType<typeof createWrapper>['invalidateSpy'],
) {
  return new Set(
    invalidateSpy.mock.calls.map(([filters]) => {
      if (!filters?.queryKey) throw new Error('Thiếu query key khi làm mới cache');
      return JSON.stringify(filters.queryKey);
    }),
  );
}

function expectedKeys(keys: readonly (readonly unknown[])[]) {
  return new Set(keys.map((key) => JSON.stringify(key)));
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('các hook mutation ghi chú', () => {
  it('tạo trang con chỉ làm mới danh sách của đúng trang cha', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages`, () =>
        envelope(buildPage({ id: 'page-con', parentId: 'page-cha' })),
      ),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreatePage(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        workspaceId: 'ws-1',
        parentId: 'page-cha',
        title: 'Trang con',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getInvalidatedKeys(invalidateSpy)).toEqual(
      expectedKeys([notionKeys.pageChildren('ws-1', 'page-cha')]),
    );
    expect(getInvalidatedKeys(invalidateSpy)).not.toContain(
      JSON.stringify(notionKeys.all),
    );
  });

  it('di chuyển trang làm mới danh sách của cả cha cũ và cha mới', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages/:id/move`, () =>
        envelope(buildPage({ id: 'page-1', parentId: 'cha-moi' })),
      ),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useMovePage(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'page-1',
        workspaceId: 'ws-1',
        parentId: 'cha-moi',
        fromParentId: 'cha-cu',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getInvalidatedKeys(invalidateSpy)).toEqual(
      expectedKeys([
        notionKeys.pageChildren('ws-1', 'cha-cu'),
        notionKeys.pageChildren('ws-1', 'cha-moi'),
      ]),
    );
  });

  it('xoá trang làm mới cả danh sách yêu thích', async () => {
    server.use(
      http.delete(`${NOTION_URL}/api/v1/pages/:id`, () =>
        envelope({ deletedPageCount: 1 }),
      ),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useRemovePage(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'page-1',
        workspaceId: 'ws-1',
        parentId: 'page-cha',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getInvalidatedKeys(invalidateSpy)).toEqual(
      expectedKeys([
        notionKeys.pageChildren('ws-1', 'page-cha'),
        notionKeys.trash('ws-1'),
        notionKeys.favorites(),
      ]),
    );
  });
});
