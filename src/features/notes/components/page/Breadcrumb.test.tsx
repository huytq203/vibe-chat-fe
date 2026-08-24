import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const NOTION_URL = 'http://localhost:3007';
const PAGE_ID = 'page-current';
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: '2026-08-24T00:00:00.000Z',
  });
}

function renderBreadcrumb() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectPage = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(<Breadcrumb pageId={PAGE_ID} onSelectPage={onSelectPage} />, { wrapper: Wrapper });
  return { onSelectPage };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('đường dẫn trang', () => {
  it('hiện đủ cấp, đánh dấu cấp cuối và điều hướng khi bấm cấp cha', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/breadcrumb`, () =>
        envelope([
          { id: 'page-root', title: 'Gốc', icon: null },
          { id: 'page-parent', title: '', icon: null },
          { id: PAGE_ID, title: 'Trang hiện tại', icon: null },
        ]),
      ),
    );
    const { onSelectPage } = renderBreadcrumb();
    const user = userEvent.setup();
    const navigation = screen.getByRole('navigation', { name: 'Đường dẫn trang' });

    expect(await within(navigation).findAllByRole('listitem')).toHaveLength(3);
    expect(within(navigation).getByText('Trang hiện tại')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(navigation).getByRole('button', { name: 'Không có tiêu đề' })).toBeInTheDocument();

    await user.click(within(navigation).getByRole('button', { name: 'Gốc' }));
    expect(onSelectPage).toHaveBeenCalledWith('page-root');
  });
});
