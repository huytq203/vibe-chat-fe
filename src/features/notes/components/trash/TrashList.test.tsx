import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { TrashItem } from '@/features/notes/types';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { TrashList } from './TrashList';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function buildItem(overrides: Partial<TrashItem> & Pick<TrashItem, 'id'>): TrashItem {
  const { id, ...rest } = overrides;
  return {
    id,
    title: 'Trang đã xoá',
    icon: null,
    deletedAt: daysAgo(3),
    deletedBy: 'user-1',
    pageCount: 1,
    parentId: null,
    parentTitle: null,
    ...rest,
  };
}

function useTrashResponse(items: TrashItem[]) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/trash`, () => envelope(items)),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('danh sách thùng rác', () => {
  it('hiện skeleton khi đang tải', () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/trash`, () => new Promise(() => undefined)),
    );

    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);

    expect(screen.getByTestId('trash-list-loading')).toBeInTheDocument();
  });

  it('hiện lỗi nhỏ và cho thử tải lại', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/trash`, () =>
        HttpResponse.json({ message: 'Lỗi máy chủ' }, { status: 500 })),
    );
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);
    expect(await screen.findByText('Không tải được thùng rác')).toBeInTheDocument();

    useTrashResponse([]);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByText('Thùng rác trống')).toBeInTheDocument();
  });

  it('rỗng → hiện Thùng rác trống', async () => {
    useTrashResponse([]);
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);

    expect(await screen.findByText('Thùng rác trống')).toBeInTheDocument();
  });

  it('hiện đúng tên trang, đường dẫn cha mờ và số ngày còn lại', async () => {
    useTrashResponse([
      buildItem({ id: 'item-1', title: 'Kế hoạch Q3', parentTitle: 'Dự án', deletedAt: daysAgo(5) }),
    ]);
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);

    expect(await screen.findByText('Kế hoạch Q3')).toBeInTheDocument();
    expect(screen.getByText('trong «Dự án»')).toBeInTheDocument();
    expect(screen.getByText('còn 25 ngày')).toBeInTheDocument();
  });

  it('trang gốc (không có cha) không hiện dòng đường dẫn cha', async () => {
    useTrashResponse([buildItem({ id: 'item-2', title: 'Trang gốc' })]);
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);

    expect(await screen.findByText('Trang gốc')).toBeInTheDocument();
    expect(screen.queryByText(/^trong «/)).not.toBeInTheDocument();
  });

  it('bấm Khôi phục gửi đúng pageId, workspaceId, parentId', async () => {
    useTrashResponse([buildItem({ id: 'item-3', parentId: 'parent-9' })]);
    let restoredId = '';
    server.use(
      http.post(`${NOTION_URL}/api/v1/trash/item-3/restore`, ({ params }) => {
        restoredId = String(params.pageId ?? 'item-3');
        return envelope({ restoredPageCount: 1, reparentedToRoot: false });
      }),
    );
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Khôi phục' }));

    await waitFor(() => expect(restoredId).toBe('item-3'));
  });

  it('xoá vĩnh viễn: nút chỉ bật khi gõ đúng tên, xác nhận gọi DELETE', async () => {
    useTrashResponse([buildItem({ id: 'item-4', title: 'Ghi chú cũ' })]);
    let purgeCount = 0;
    server.use(
      http.delete(`${NOTION_URL}/api/v1/trash/item-4`, () => {
        purgeCount += 1;
        return envelope({ deletedPageCount: 1, deletedObjectCount: 0 });
      }),
    );
    renderWithProviders(<TrashList workspaceId={WORKSPACE_ID} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Xoá vĩnh viễn' }));
    expect(screen.getByRole('button', { name: 'Xác nhận xoá vĩnh viễn' })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Nhập tên trang để xác nhận' }), 'Ghi chú cũ');
    expect(screen.getByRole('button', { name: 'Xác nhận xoá vĩnh viễn' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận xoá vĩnh viễn' }));

    await waitFor(() => expect(purgeCount).toBe(1));
  });
});
