import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

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

function buildWorkspace(id: string, name: string, icon: string | null = null) {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    icon,
    type: 'TEAM',
    ownerId: 'user-1',
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    deletedAt: null,
  };
}

function renderSwitcher(activeWorkspaceId: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectWorkspace = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(
    <WorkspaceSwitcher
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={onSelectWorkspace}
    />,
    { wrapper: Wrapper },
  );
  return { onSelectWorkspace };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('bộ chuyển workspace', () => {
  it('hiện skeleton trong lúc tải', () => {
    server.use(http.get(`${NOTION_URL}/api/v1/workspaces`, () => new Promise(() => undefined)));
    renderSwitcher();
    expect(screen.getByTestId('workspace-switcher-skeleton')).toBeInTheDocument();
  });

  it('hiện trạng thái lỗi và nút thử lại', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces`, () =>
        HttpResponse.json({ message: 'Lỗi kiểm thử' }, { status: 500 }),
      ),
    );
    renderSwitcher();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('hiện lời kêu gọi tạo workspace đầu tiên khi danh sách rỗng', async () => {
    server.use(http.get(`${NOTION_URL}/api/v1/workspaces`, () => envelope([])));
    renderSwitcher();
    expect(
      await screen.findByRole('button', { name: 'Tạo workspace đầu tiên' }),
    ).toBeInTheDocument();
  });

  it('đặt dấu chọn đúng workspace đang mở', async () => {
    const workspaces = [
      buildWorkspace('workspace-1', 'Workspace Một', '🏠'),
      buildWorkspace('workspace-2', 'Workspace Hai'),
    ];
    server.use(http.get(`${NOTION_URL}/api/v1/workspaces`, () => envelope(workspaces)));
    renderSwitcher('workspace-2');

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Chọn workspace' }));
    const activeItem = await screen.findByRole('menuitem', { name: 'Workspace Hai' });
    expect(activeItem).toHaveAttribute('aria-current', 'true');
    expect(within(activeItem).getByTestId('active-workspace-check')).toBeInTheDocument();
    expect(
      within(screen.getByRole('menuitem', { name: 'Workspace Một' })).queryByTestId(
        'active-workspace-check',
      ),
    ).not.toBeInTheDocument();
  });

  it('gọi callback với id khi chọn workspace khác', async () => {
    const workspaces = [
      buildWorkspace('workspace-1', 'Workspace Một'),
      buildWorkspace('workspace-2', 'Workspace Hai'),
    ];
    server.use(http.get(`${NOTION_URL}/api/v1/workspaces`, () => envelope(workspaces)));
    const { onSelectWorkspace } = renderSwitcher('workspace-1');

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Chọn workspace' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Workspace Hai' }));
    await waitFor(() => expect(onSelectWorkspace).toHaveBeenCalledWith('workspace-2'));
  });
});
