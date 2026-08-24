import type { ReactNode } from 'react';
import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { notionKeys } from '@/services/keys';
import {
  useCreateComment,
  useCreateVersion,
  useRestoreVersion,
} from './use-mutations';

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

const commentRecord = {
  id: 'comment-1', pageId: 'page-1', blockId: 'block-1', parentId: null,
  authorId: 'user-1', body: { segments: [{ type: 'text' as const, text: 'Nội dung' }] },
  resolvedAt: null, resolvedBy: null,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z', deletedAt: null,
};

const version = {
  id: 'version-1', pageId: 'page-1', kind: 'MANUAL', label: null,
  sizeBytes: 128, preview: 'Bản xem trước', createdBy: 'user-1',
  createdAt: '2026-08-24T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

function invalidatedKeys(spy: ReturnType<typeof createWrapper>['invalidateSpy']) {
  return spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('mutation bình luận và phiên bản', () => {
  it('tạo bình luận chỉ làm mới cache trang và khối liên quan', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages/page-1/comments`, () => envelope(commentRecord)),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreateComment(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 'page-1', blockId: 'block-1', body: commentRecord.body,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(new Set(invalidatedKeys(invalidateSpy))).toEqual(new Set([
      JSON.stringify(notionKeys.comments('page-1')),
      JSON.stringify(notionKeys.comments('page-1', 'block-1')),
    ]));
    expect(invalidatedKeys(invalidateSpy)).not.toContain(JSON.stringify(notionKeys.all));
  });

  it('tạo mốc chỉ làm mới danh sách phiên bản của trang', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages/page-1/versions`, () => envelope(version)),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreateVersion(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ pageId: 'page-1', label: 'Trước khi sửa' });
    });

    expect(invalidatedKeys(invalidateSpy)).toEqual([
      JSON.stringify(notionKeys.versions('page-1')),
    ]);
  });

  it('khôi phục làm mới phiên bản và chi tiết đúng trang', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/versions/version-1/restore`, () =>
        envelope({ pageId: 'page-1', previousVersionId: 'version-2' }),
      ),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useRestoreVersion(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('version-1');
    });

    expect(new Set(invalidatedKeys(invalidateSpy))).toEqual(new Set([
      JSON.stringify(notionKeys.versions('page-1')),
      JSON.stringify(notionKeys.page('page-1')),
    ]));
  });
});
