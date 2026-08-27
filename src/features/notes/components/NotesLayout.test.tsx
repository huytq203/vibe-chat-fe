import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { usePathname } from 'next/navigation';
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

interface CollabDocOptions {
  enabled?: boolean;
  onStateless?: (payload: string) => void;
}

const collabMocks = vi.hoisted(() => ({
  awareness: vi.fn(() => [{
    userId: 'user-1',
    name: 'Người viết',
    color: 'var(--primary)',
    isSelf: true,
  }]),
  collabDoc: vi.fn((pageId: string, options?: CollabDocOptions) => {
    void pageId;
    void options;
    return {
      doc: null,
      provider: null,
      status: 'connecting' as 'connecting' | 'connected' | 'disconnected' | 'offline',
      isLocalReady: false,
      isSynced: false,
      error: null as string | null,
    };
  }),
}));

vi.mock('next/navigation', () => ({
  useParams: () => navigation.params,
  usePathname: vi.fn(() => '/notes'),
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

vi.mock('@/features/notes/hooks/useAwareness', () => ({
  useAwareness: collabMocks.awareness,
}));

vi.mock('@/features/notes/hooks/useCollabDoc', () => ({
  useCollabDoc: collabMocks.collabDoc,
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
    myRole: 'OWNER',
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

  return {
    ...render(<NotesLayout />, { wrapper: Wrapper }),
    queryClient,
  };
}

function useDefaultHandlers(pages = [buildPage()]) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/workspaces`, () => envelope([buildWorkspace()])),
    http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/pages`, () => envelope(pages)),
    http.get(`${NOTION_URL}/api/v1/pages/page-1`, () => envelope({
      ...buildPage(),
      myRole: 'EDIT',
    })),
    http.get(`${NOTION_URL}/api/v1/pages/page-1/breadcrumb`, () => envelope([
      { id: 'page-1', title: 'Tài liệu dự án' },
    ])),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  navigation.params = {};
  navigation.push.mockReset();
  navigation.replace.mockReset();
  vi.mocked(usePathname).mockReturnValue('/notes');
  useNotesUiStore.setState({ activeWorkspaceId: null, expandedByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
  collabMocks.collabDoc.mockReturnValue({
    doc: null,
    provider: null,
    status: 'connecting',
    isLocalReady: false,
    isSynced: false,
    error: null,
  });
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

  it('vẫn điều hướng đúng URL khi chọn trang từ sidebar lúc đang ở /notes/trash', async () => {
    // /notes/trash không có [workspaceId] trong path nên routeWorkspaceId luôn null —
    // trước fix, handleSelectPage dùng routeWorkspaceId nên bấm chọn trang không làm gì.
    vi.mocked(usePathname).mockReturnValue('/notes/trash');
    navigation.params = {};
    useDefaultHandlers();
    renderLayout();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(useNotesUiStore.getState().activeWorkspaceId).toBe(WORKSPACE_ID);
    });
    await user.click(await screen.findByRole('treeitem', { name: /Tài liệu dự án/ }));

    expect(navigation.push).toHaveBeenCalledWith(`/notes/${WORKSPACE_ID}/page-1`);
  });

  it('hiện trạng thái rỗng khi chưa chọn trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID };
    useDefaultHandlers();
    renderLayout();

    expect(await screen.findByText('Chọn một trang ở bên trái')).toBeInTheDocument();
  });

  it('dùng surface card đồng bộ với shell desktop và chỉ hiện sidebar trên mobile khi chưa chọn trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID };
    useDefaultHandlers();
    renderLayout();

    await screen.findByRole('treeitem', { name: /Tài liệu dự án/ });
    expect(screen.getByTestId('notes-sidebar-surface')).toHaveClass(
      'md:w-[300px]',
      'md:rounded-2xl',
      'md:border',
      'md:shadow-subtle',
    );
    expect(screen.getByTestId('notes-sidebar-surface')).toHaveClass('flex');
    expect(screen.getByTestId('notes-main-pane')).toHaveClass('hidden', 'md:flex');
  });

  it('chỉ hiện tài liệu trên mobile khi đã chọn trang và cho quay lại cây trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID, pageId: 'page-1' };
    useDefaultHandlers();
    renderLayout();
    const user = userEvent.setup();

    await screen.findByText('Tài liệu dự án');
    expect(screen.getByTestId('notes-sidebar-surface')).toHaveClass('hidden', 'md:flex');
    expect(screen.getByTestId('notes-main-pane')).toHaveClass('flex');

    await user.click(screen.getByRole('button', { name: 'Quay lại danh sách trang' }));
    expect(navigation.push).toHaveBeenCalledWith(`/notes/${WORKSPACE_ID}`);
  });

  it('đặt hiện diện và nguyên văn lỗi server trên dải breadcrumb', async () => {
    const serverMessage = 'This page already has 50 people connected, please try again later';
    navigation.params = { workspaceId: WORKSPACE_ID, pageId: 'page-1' };
    collabMocks.collabDoc.mockReturnValue({
      doc: null,
      provider: null,
      status: 'disconnected',
      isLocalReady: false,
      isSynced: false,
      error: serverMessage,
    });
    useDefaultHandlers();
    renderLayout();

    expect(await screen.findByRole('status')).toHaveTextContent(serverMessage);
    expect(screen.getByLabelText('Người viết (Bạn)')).toBeInTheDocument();
  });

  it('chỉ làm mới bình luận khi tín hiệu stateless khớp trang', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID, pageId: 'page-1' };
    useDefaultHandlers();
    const { queryClient } = renderLayout();
    await screen.findByText('Tài liệu dự án');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const options = collabMocks.collabDoc.mock.calls.at(-1)?.[1];
    if (!options?.onStateless) {
      throw new Error('Callback stateless chưa được truyền vào hook trong test');
    }

    options.onStateless('{"type":"comments-changed","pageId":"page-1"}');

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['notion', 'comments', 'page-1'],
    });

    invalidateSpy.mockClear();
    options.onStateless('{"type":"khong-ro","pageId":"page-1"}');
    options.onStateless('{"type":"comments-changed","pageId":"page-2"}');
    expect(() => options.onStateless?.('{json-hong')).not.toThrow();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('Ctrl+K mở dialog tìm nhanh', async () => {
    navigation.params = { workspaceId: WORKSPACE_ID };
    useDefaultHandlers();
    renderLayout();
    await screen.findByRole('treeitem', { name: /Tài liệu dự án/ });

    await userEvent.keyboard('{Control>}k{/Control}');

    expect(await screen.findByRole('textbox', { name: 'Tìm trang' })).toBeInTheDocument();
  });
});
