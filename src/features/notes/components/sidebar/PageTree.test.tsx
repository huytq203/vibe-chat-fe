import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { PageTree } from './PageTree';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const NOTION_URL = 'http://localhost:3007';
const WORKSPACE_ID = 'workspace-1';
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: '2026-08-24T00:00:00.000Z',
  });
}

function buildPage(id: string, title: string, parentId: string | null = null) {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    parentId,
    path: parentId ? `/page-root/${id}` : `/${id}`,
    depth: parentId ? 1 : 0,
    sortKey: 'a0',
    title,
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

function renderTree() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectPage = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(
    <PageTree
      workspaceId={WORKSPACE_ID}
      activePageId={null}
      onSelectPage={onSelectPage}
    />,
    { wrapper: Wrapper },
  );
  return { onSelectPage };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useNotesUiStore.setState({ activeWorkspaceId: null, expandedByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
});
afterAll(() => server.close());

describe('cây trang cấp gốc', () => {
  it('hiện đúng năm hàng skeleton trong lúc tải', () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () =>
        new Promise(() => undefined),
      ),
    );
    renderTree();

    expect(screen.getByTestId('page-tree-loading').children).toHaveLength(5);
  });

  it('hiện trạng thái lỗi và nút thử lại', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () =>
        HttpResponse.json({ message: 'Lỗi kiểm thử' }, { status: 500 }),
      ),
    );
    renderTree();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('hiện trạng thái rỗng và tạo trang đầu tiên ở cấp gốc', async () => {
    let createInput: unknown;
    const createdPage = buildPage('page-new', 'Trang mới');
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => envelope([])),
      http.post(`${NOTION_URL}/api/v1/pages`, async ({ request }) => {
        createInput = await request.json();
        return envelope(createdPage);
      }),
    );
    const { onSelectPage } = renderTree();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tạo trang đầu tiên' }));

    await waitFor(() => expect(createInput).toEqual({ workspaceId: WORKSPACE_ID }));
    expect(onSelectPage).toHaveBeenCalledWith('page-new');
  });

  it('hiện danh sách trang khi có dữ liệu', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () =>
        envelope([buildPage('page-1', 'Tài liệu dự án')]),
      ),
    );
    renderTree();

    expect(await screen.findByRole('treeitem', { name: /Tài liệu dự án/ })).toBeInTheDocument();
  });
});
