import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FavoriteList } from './FavoriteList';

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

function buildFavorite(pageId: string, title: string, icon: string | null = null) {
  return {
    userId: 'user-1',
    pageId,
    sortKey: 'a0',
    title,
    icon,
  };
}

function renderFavoriteList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectPage = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(<FavoriteList onSelectPage={onSelectPage} />, { wrapper: Wrapper });
  return { onSelectPage };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('danh sách trang ghim', () => {
  it('hiện hai hàng skeleton trong lúc tải', () => {
    server.use(http.get(`${NOTION_URL}/api/v1/favorites`, () => new Promise(() => undefined)));
    renderFavoriteList();

    expect(screen.getByTestId('favorite-list-loading').children).toHaveLength(2);
  });

  it('hiện trạng thái lỗi gọn trong sidebar', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/favorites`, () =>
        HttpResponse.json({ message: 'Lỗi kiểm thử' }, { status: 500 }),
      ),
    );
    renderFavoriteList();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được trang ghim');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('ẩn hoàn toàn cả nhóm và nhãn Ghim khi danh sách rỗng', async () => {
    server.use(http.get(`${NOTION_URL}/api/v1/favorites`, () => envelope([])));
    renderFavoriteList();

    await waitFor(() => expect(screen.queryByText('Ghim')).not.toBeInTheDocument());
    expect(screen.queryByTestId('favorite-list-loading')).not.toBeInTheDocument();
  });

  it('hiện dữ liệu và chọn đúng trang khi bấm', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/favorites`, () =>
        envelope([
          buildFavorite('page-1', 'Tài liệu dự án', '📘'),
          buildFavorite('page-2', '', null),
        ]),
      ),
    );
    const { onSelectPage } = renderFavoriteList();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tài liệu dự án' }));

    expect(screen.getByText('Ghim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Không có tiêu đề' })).toBeInTheDocument();
    expect(onSelectPage).toHaveBeenCalledWith('page-1');
  });
});
