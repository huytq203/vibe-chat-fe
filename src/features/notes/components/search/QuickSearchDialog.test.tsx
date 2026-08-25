import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page, SearchResult } from '@/features/notes/types';
import { recordRecentPage } from '@/features/notes/lib/recent-pages';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { QuickSearchDialog } from './QuickSearchDialog';

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
    timestamp: '2026-08-25T00:00:00.000Z',
  });
}

function buildResult(overrides: Partial<SearchResult> & Pick<SearchResult, 'pageId'>): SearchResult {
  const { pageId, ...rest } = overrides;
  return {
    pageId, title: 'Kết quả', icon: null, snippet: 'đoạn <b>khớp</b> văn bản', role: 'EDIT', ...rest,
  };
}

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: 'page-new', workspaceId: WORKSPACE_ID, parentId: null, path: '.page-new.',
    depth: 1, sortKey: 'a0', title: 'chưa từng có', icon: null, coverUrl: null,
    createdBy: 'user-1', lastEditedBy: null,
    createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z',
    deletedAt: null, deletedBy: null, deletedRootId: null,
    ...overrides,
  };
}

function useSearchResponse(results: SearchResult[]) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/search`, () => envelope(results)),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => localStorage.clear());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('QuickSearchDialog', () => {
  it('rỗng, chưa có trang gần đây → gợi ý gõ để tìm', () => {
    renderWithProviders(
      <QuickSearchDialog workspaceId={WORKSPACE_ID} open onOpenChange={vi.fn()} onSelectPage={vi.fn()} />,
    );

    expect(screen.getByText('Gõ để tìm trang')).toBeInTheDocument();
  });

  it('rỗng, có trang gần đây → hiện mục "Gần đây"', () => {
    recordRecentPage({ id: 'page-recent', workspaceId: WORKSPACE_ID, title: 'Trang gần đây', icon: null });
    renderWithProviders(
      <QuickSearchDialog workspaceId={WORKSPACE_ID} open onOpenChange={vi.fn()} onSelectPage={vi.fn()} />,
    );

    expect(screen.getByText('Gần đây')).toBeInTheDocument();
    expect(screen.getByText('Trang gần đây')).toBeInTheDocument();
  });

  it('gõ có kết quả → hiện đúng tiêu đề và in đậm đúng từ khớp trong snippet', async () => {
    useSearchResponse([buildResult({ pageId: 'page-1', title: 'Kế hoạch Q3' })]);
    renderWithProviders(
      <QuickSearchDialog workspaceId={WORKSPACE_ID} open onOpenChange={vi.fn()} onSelectPage={vi.fn()} />,
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Tìm trang' }), 'kế hoạch');

    expect(await screen.findByText('Kế hoạch Q3')).toBeInTheDocument();
    const highlighted = screen.getByText('khớp');
    expect(highlighted.tagName).toBe('B');
  });

  it('gõ không ra kết quả → gợi ý tạo trang, bấm gọi đúng workspaceId/title và mở trang mới', async () => {
    useSearchResponse([]);
    let requestBody: unknown;
    server.use(
      http.post(`${NOTION_URL}/api/v1/pages`, async ({ request }) => {
        requestBody = await request.json();
        return envelope(buildPage({ id: 'page-created', title: 'chưa từng có' }));
      }),
    );
    const onSelectPage = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <QuickSearchDialog workspaceId={WORKSPACE_ID} open onOpenChange={onOpenChange} onSelectPage={onSelectPage} />,
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Tìm trang' }), 'chưa từng có');
    expect(await screen.findByText('Không tìm thấy «chưa từng có»')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Tạo trang "chưa từng có"' }));

    await waitFor(() => expect(requestBody).toEqual({ workspaceId: WORKSPACE_ID, title: 'chưa từng có' }));
    expect(onSelectPage).toHaveBeenCalledWith('page-created');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('phím mũi tên di chuyển lựa chọn, Enter mở đúng hàng đang chọn', async () => {
    useSearchResponse([
      buildResult({ pageId: 'page-1', title: 'Kết quả một' }),
      buildResult({ pageId: 'page-2', title: 'Kết quả hai' }),
    ]);
    const onSelectPage = vi.fn();
    renderWithProviders(
      <QuickSearchDialog workspaceId={WORKSPACE_ID} open onOpenChange={vi.fn()} onSelectPage={onSelectPage} />,
    );
    const input = screen.getByRole('textbox', { name: 'Tìm trang' });

    await userEvent.type(input, 'kết quả');
    await screen.findByText('Kết quả một');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onSelectPage).toHaveBeenCalledWith('page-2');
  });
});
