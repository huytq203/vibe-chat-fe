import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { InternalPermissionSection } from '../InternalPermissionSection';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const VIBE_URL = 'http://localhost:3005';
const NOTION_URL = 'http://localhost:3007';
const PAGE_ID = 'page-1';
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({ success: true, data, timestamp: '2026-08-25T00:00:00.000Z' });
}

function searchResult() {
  return {
    items: [{
      id: 'user-2',
      username: 'nguyenvana',
      displayName: 'Nguyễn Văn A',
      avatarUrl: null,
      isBot: false,
      friendship: 'NONE',
    }],
    nextCursor: null,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('InternalPermissionSection — chọn người rồi thêm quyền', () => {
  it('đóng danh sách kết quả tìm kiếm sau khi chọn một người, không che nút Thêm', async () => {
    server.use(
      http.get(`${VIBE_URL}/api/v1/users/search`, () => envelope(searchResult())),
    );
    renderWithProviders(
      <InternalPermissionSection members={[]} pageId={PAGE_ID} permissions={[]} />,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('textbox', { name: 'Tìm người để cấp quyền' }),
      'nguyen',
    );
    const option = await screen.findByRole('option', { name: /Nguyễn Văn A/ });
    await user.click(option);

    // Bug gốc: danh sách kết quả không đóng lại sau khi chọn (vẫn còn >= 2 ký tự trong
    // ô tìm) nên nó tiếp tục phủ z-30 lên hàng vai trò + nút Thêm ngay bên dưới — người
    // dùng bấm "Thêm" trong trình duyệt thật sẽ trúng danh sách, không trúng nút.
    expect(screen.queryByRole('listbox', { name: 'Kết quả tìm người' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeVisible();
  });

  it('gửi đúng subjectId/role đã chọn khi bấm Thêm', async () => {
    server.use(
      http.get(`${VIBE_URL}/api/v1/users/search`, () => envelope(searchResult())),
      http.put(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions`, async ({ request }) => {
        const body = await request.json() as { subjectId: string; role: string };
        expect(body).toMatchObject({ subjectId: 'user-2', role: 'VIEW', subjectType: 'USER' });
        return envelope({
          id: 'perm-1', pageId: PAGE_ID, subjectType: 'USER', subjectId: 'user-2',
          role: 'VIEW', grantedBy: 'user-1', createdAt: '2026-08-25T00:00:00.000Z',
        });
      }),
    );
    renderWithProviders(
      <InternalPermissionSection members={[]} pageId={PAGE_ID} permissions={[]} />,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('textbox', { name: 'Tìm người để cấp quyền' }),
      'nguyen',
    );
    await user.click(await screen.findByRole('option', { name: /Nguyễn Văn A/ }));
    await user.click(screen.getByRole('button', { name: 'Thêm' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã cập nhật quyền truy cập'));
  });
});
