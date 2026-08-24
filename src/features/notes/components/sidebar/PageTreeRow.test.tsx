import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import type { Page } from '@/features/notes/types';
import { PageTreeRow } from './PageTreeRow';

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

function buildPage(
  id: string,
  title: string,
  parentId: string | null = null,
  depth = parentId ? 1 : 0,
): Page {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    parentId,
    path: parentId ? `/page-root/${id}` : `/${id}`,
    depth,
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

function renderRow(page = buildPage('page-root', 'Trang cha'), depth = 0) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onSelectPage = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const result = render(
    <div role="tree" aria-label="Cây trang kiểm thử">
      <PageTreeRow
        workspaceId={WORKSPACE_ID}
        activePageId={null}
        onSelectPage={onSelectPage}
        page={page}
        depth={depth}
      />
    </div>,
    { wrapper: Wrapper },
  );
  return { ...result, onSelectPage };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useNotesUiStore.setState({ activeWorkspaceId: null, expandedByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
});
afterAll(() => server.close());

describe('một hàng trong cây trang', () => {
  it('không gọi API con trước khi mở và chỉ gọi đúng một lần sau khi mở', async () => {
    let childRequestCount = 0;
    const childPage = buildPage('page-child', 'Trang con', 'page-root');
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, ({ request }) => {
        if (new URL(request.url).searchParams.get('parentId') === 'page-root') {
          childRequestCount += 1;
          return envelope([childPage]);
        }
        return envelope([]);
      }),
    );
    renderRow();

    expect(childRequestCount).toBe(0);
    expect(screen.queryByText('Trang con')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mở trang Trang cha' }));

    expect(await screen.findByText('Trang con')).toBeInTheDocument();
    expect(childRequestCount).toBe(1);
  });

  it('ghi trạng thái gập mở vào storage và đọc lại khi hydrate', async () => {
    const childPage = buildPage('page-child', 'Trang con', 'page-root');
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, ({ request }) =>
        envelope(
          new URL(request.url).searchParams.get('parentId') === 'page-root'
            ? [childPage]
            : [],
        ),
      ),
    );
    const firstRender = renderRow();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mở trang Trang cha' }));

    await waitFor(() =>
      expect(useNotesUiStore.getState().expandedByWorkspace[WORKSPACE_ID]).toEqual([
        'page-root',
      ]),
    );
    const persistedValue = localStorage.getItem('halo-notes-ui');
    expect(persistedValue).toContain('page-root');
    firstRender.unmount();

    useNotesUiStore.setState({ expandedByWorkspace: {} });
    if (persistedValue) localStorage.setItem('halo-notes-ui', persistedValue);
    await act(async () => {
      await useNotesUiStore.persist.rehydrate();
    });

    expect(useNotesUiStore.getState().expandedByWorkspace[WORKSPACE_ID]).toEqual([
      'page-root',
    ]);
    renderRow();
    await waitFor(() =>
      expect(screen.getByRole('treeitem', { name: /Trang cha/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
    await screen.findByText('Trang con');
    await user.click(screen.getByRole('button', { name: 'Gập trang Trang cha' }));
    expect(useNotesUiStore.getState().expandedByWorkspace[WORKSPACE_ID]).toEqual([]);
    expect(localStorage.getItem('halo-notes-ui')).not.toContain('page-root');
  });

  it('không tải hoặc render cấp thứ mười một', async () => {
    let requestCount = 0;
    useNotesUiStore.setState({
      expandedByWorkspace: { [WORKSPACE_ID]: ['page-depth-10'] },
    });
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => {
        requestCount += 1;
        return envelope([buildPage('page-depth-11', 'Cấp quá sâu', 'page-depth-10', 10)]);
      }),
    );

    renderRow(buildPage('page-depth-10', 'Cấp mười', 'page-depth-9', 9), 9);

    await waitFor(() =>
      expect(screen.getByRole('treeitem', { name: /Cấp mười/ })).not.toHaveAttribute(
        'aria-expanded',
      ),
    );
    expect(screen.queryByText('Cấp quá sâu')).not.toBeInTheDocument();
    expect(requestCount).toBe(0);
  });

  it('tạo trang con với đúng parentId, tự mở cha và chọn trang mới', async () => {
    let createInput: unknown;
    const createdPage = buildPage('page-created', 'Trang vừa tạo', 'page-root');
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => envelope([])),
      http.post(`${NOTION_URL}/api/v1/pages`, async ({ request }) => {
        createInput = await request.json();
        return envelope(createdPage);
      }),
    );
    const { onSelectPage } = renderRow();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Tạo trang con trong Trang cha' }));

    await waitFor(() =>
      expect(createInput).toEqual({ workspaceId: WORKSPACE_ID, parentId: 'page-root' }),
    );
    expect(useNotesUiStore.getState().expandedByWorkspace[WORKSPACE_ID]).toContain('page-root');
    expect(onSelectPage).toHaveBeenCalledWith('page-created');
  });

  it('menu chỉ có sao chép liên kết và xoá', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => envelope([])),
    );
    renderRow();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Tuỳ chọn trang Trang cha' }));

    expect(await screen.findAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Sao chép liên kết' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Xoá' })).toBeInTheDocument();
  });
});
