import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NewPageButton } from './NewPageButton';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const NOTION_URL = 'http://localhost:3007';
const server = setupServer();

function buildPage() {
  return {
    id: 'page-new',
    workspaceId: 'ws-1',
    parentId: null,
    path: 'page-new',
    depth: 0,
    sortKey: 'a0',
    title: '',
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

function renderNewPageButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectPage = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(<NewPageButton workspaceId="ws-1" onSelectPage={onSelectPage} />, { wrapper: Wrapper });
  return { onSelectPage };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('nút tạo trang mới ở sidebar', () => {
  it('tạo trang gốc (không parentId) rồi mở trang vừa tạo', async () => {
    const bodies: unknown[] = [];
    server.use(http.post(`${NOTION_URL}/api/v1/pages`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        success: true,
        data: buildPage(),
        timestamp: '2026-08-24T00:00:00.000Z',
      });
    }));
    const { onSelectPage } = renderNewPageButton();

    await userEvent.click(screen.getByRole('button', { name: 'Tạo trang mới' }));

    await waitFor(() => expect(onSelectPage).toHaveBeenCalledWith('page-new'));
    expect(bodies).toEqual([{ workspaceId: 'ws-1' }]);
  });

  it('không gọi onSelectPage khi tạo trang thất bại', async () => {
    server.use(http.post(`${NOTION_URL}/api/v1/pages`, () =>
      HttpResponse.json({ success: false, message: 'Lỗi' }, { status: 500 })));
    const { onSelectPage } = renderNewPageButton();

    await userEvent.click(screen.getByRole('button', { name: 'Tạo trang mới' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo trang mới' })).toBeEnabled());
    expect(onSelectPage).not.toHaveBeenCalled();
  });
});
