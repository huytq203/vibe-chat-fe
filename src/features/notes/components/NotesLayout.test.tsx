import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { NotesLayout } from './NotesLayout';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const navigation = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

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

function buildWorkspace() {
  return {
    id: WORKSPACE_ID,
    name: 'Workspace Một',
    slug: 'workspace-mot',
    icon: null,
    type: 'TEAM',
    ownerId: 'user-1',
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    deletedAt: null,
  };
}

function buildPage() {
  return {
    id: 'page-1',
    workspaceId: WORKSPACE_ID,
    parentId: null,
    path: '/page-1',
    depth: 0,
    sortKey: 'a0',
    title: 'Tài liệu dự án',
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

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(<NotesLayout />, { wrapper: Wrapper });
}

function useDefaultHandlers(pages = [buildPage()]) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/workspaces`, () => envelope([buildWorkspace()])),
    http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => envelope(pages)),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  navigation.params = {};
  navigation.push.mockReset();
  navigation.replace.mockReset();
  useNotesUiStore.setState({ activeWorkspaceId: null, expandedByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
});
afterAll(() => server.close());

describe('bố cục ghi chú', () => {
  it('chuyển sang workspace đầu tiên khi URL chưa có workspace', async () => {
    useDefaultHandlers();
    renderLayout();

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(`/notes/${WORKSPACE_ID}`);
    });
  });

  it('điều hướng đúng URL khi chọn trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID };
    useDefaultHandlers();
    renderLayout();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('treeitem', { name: /Tài liệu dự án/ }));

    expect(navigation.push).toHaveBeenCalledWith(`/notes/${WORKSPACE_ID}/page-1`);
  });

  it('hiện trạng thái rỗng khi chưa chọn trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID };
    useDefaultHandlers();
    renderLayout();

    expect(await screen.findByText('Chọn một trang ở bên trái')).toBeInTheDocument();
  });
});
