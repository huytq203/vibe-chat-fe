import type { ReactNode } from 'react';
import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { notionKeys } from '@/services/keys';
import { useCreatePage, useMovePage, useRemovePage } from './use-mutations';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

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

  return { Wrapper, invalidateSpy, queryClient };
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
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
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

  it('di chuyển trang ngay trong cache trước khi BE phản hồi', async () => {
    let finishRequest: () => void = () => undefined;
    const requestGate = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages/:id/move`, async () => {
        await requestGate;
        return envelope(buildPage({ id: 'page-1', parentId: 'cha-moi' }));
      }),
    );
    const { Wrapper, queryClient } = createWrapper();
    const fromKey = notionKeys.pageChildren('ws-1', 'cha-cu');
    const toKey = notionKeys.pageChildren('ws-1', 'cha-moi');
    const moved = { ...buildPage({ id: 'page-1', parentId: 'cha-cu' }), sortKey: 'a0' };
    const target = { ...buildPage({ id: 'page-2', parentId: 'cha-moi' }), sortKey: 'a2' };
    queryClient.setQueryData(fromKey, [moved]);
    queryClient.setQueryData(toKey, [target]);
    const { result } = renderHook(() => useMovePage(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        id: moved.id,
        workspaceId: 'ws-1',
        parentId: 'cha-moi',
        fromParentId: 'cha-cu',
        sortKey: 'a1',
      });
    });

    await waitFor(() => expect(queryClient.getQueryData(fromKey)).toEqual([]));
    expect(queryClient.getQueryData(toKey)).toEqual([
      { ...moved, parentId: 'cha-moi', sortKey: 'a1' },
      target,
    ]);
    finishRequest();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('khôi phục hai cache và hiện đúng thông điệp BE khi di chuyển bị từ chối', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages/:id/move`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'DEPTH_EXCEEDED', message: 'Cây trang sẽ vượt quá 10 cấp' },
            timestamp: '2026-08-24T00:00:00.000Z',
          },
          { status: 400 },
        ),
      ),
    );
    const { Wrapper, queryClient } = createWrapper();
    const fromKey = notionKeys.pageChildren('ws-1', 'cha-cu');
    const toKey = notionKeys.pageChildren('ws-1', 'cha-moi');
    const fromPages = [buildPage({ id: 'page-1', parentId: 'cha-cu' })];
    const toPages = [buildPage({ id: 'page-2', parentId: 'cha-moi' })];
    queryClient.setQueryData(fromKey, fromPages);
    queryClient.setQueryData(toKey, toPages);
    const { result } = renderHook(() => useMovePage(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({
        id: 'page-1',
        workspaceId: 'ws-1',
        parentId: 'cha-moi',
        fromParentId: 'cha-cu',
        sortKey: 'a1',
      })).rejects.toThrow('Cây trang sẽ vượt quá 10 cấp');
    });

    expect(queryClient.getQueryData(fromKey)).toEqual(fromPages);
    expect(queryClient.getQueryData(toKey)).toEqual(toPages);
    expect(toast.error).toHaveBeenCalledWith('Cây trang sẽ vượt quá 10 cấp');
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
