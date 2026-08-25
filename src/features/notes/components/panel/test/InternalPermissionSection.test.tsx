import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import type { EffectivePagePermission, PageRole, WorkspaceMember } from '@/features/notes/types';
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
    items: [
      { id: 'user-2', username: 'nguyenvana', displayName: 'Nguyễn Văn A',
        avatarUrl: null, isBot: false, friendship: 'NONE' },
      { id: 'user-3', username: 'nguyenvanb', displayName: 'Nguyễn Văn B',
        avatarUrl: null, isBot: false, friendship: 'NONE' },
    ],
    nextCursor: null,
  };
}

function permission(role: PageRole): EffectivePagePermission {
  return {
    permission: { id: 'perm-1', pageId: PAGE_ID, subjectType: 'USER', subjectId: 'user-2',
      role, grantedBy: 'user-1', createdAt: '2026-08-25T00:00:00.000Z' },
    inherited: false, sourcePageId: PAGE_ID, sourcePageTitle: 'Trang',
  };
}

const member: WorkspaceMember = {
  id: 'wm-1', workspaceId: 'ws-1', userId: 'user-2', role: 'MEMBER',
  invitedBy: null, joinedAt: '2026-08-25T00:00:00.000Z',
  user: { displayName: 'Nguyễn Văn A', avatarUrl: null },
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('InternalPermissionSection — thêm nhiều người trong modal', () => {
  it('chọn 2 người, gán vai trò riêng từng người rồi cấp quyền một lượt', async () => {
    const sent: { subjectId: string; role: string }[] = [];
    server.use(
      http.get(`${VIBE_URL}/api/v1/users/search`, () => envelope(searchResult())),
      http.put(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions`, async ({ request }) => {
        const body = await request.json() as { subjectId: string; role: string };
        sent.push(body);
        return envelope({ id: `perm-${body.subjectId}`, pageId: PAGE_ID, subjectType: 'USER',
          subjectId: body.subjectId, role: body.role, grantedBy: 'user-1',
          createdAt: '2026-08-25T00:00:00.000Z' });
      }),
    );
    renderWithProviders(
      <InternalPermissionSection members={[]} pageId={PAGE_ID} permissions={[]} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Thêm người' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Tìm người để cấp quyền' }),
      'nguyen',
    );
    await user.click(await screen.findByRole('option', { name: /Nguyễn Văn A/ }));
    await user.click(screen.getByRole('option', { name: /Nguyễn Văn B/ }));

    // Vai trò mặc định là "Chỉ xem"; nâng riêng người thứ hai lên "Chỉnh sửa".
    await user.click(screen.getByRole('button', { name: 'Vai trò của Nguyễn Văn B: Chỉ xem' }));
    await user.click(await screen.findByRole('menuitem', { name: /Chỉnh sửa/ }));

    await user.click(screen.getByRole('button', { name: 'Cấp quyền (2)' }));

    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent).toEqual(expect.arrayContaining([
      expect.objectContaining({ subjectId: 'user-2', role: 'VIEW', subjectType: 'USER' }),
      expect.objectContaining({ subjectId: 'user-3', role: 'EDIT', subjectType: 'USER' }),
    ]));
    expect(toast.success).toHaveBeenCalledWith('Đã cấp quyền cho 2 người');
  });

  it('không cho chọn lại người đã có quyền riêng', async () => {
    server.use(http.get(`${VIBE_URL}/api/v1/users/search`, () => envelope(searchResult())));
    renderWithProviders(
      <InternalPermissionSection
        members={[member]} pageId={PAGE_ID} permissions={[permission('VIEW')]} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Thêm người' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Tìm người để cấp quyền' }),
      'nguyen',
    );

    const granted = await screen.findByRole('option', { name: /Nguyễn Văn A/ });
    expect(granted).toBeDisabled();
    expect(within(granted).getByText('Đã có quyền')).toBeInTheDocument();
  });
});

describe('InternalPermissionSection — sửa quyền ngay trong danh sách', () => {
  it('đổi vai trò người đã có quyền không cần mở modal', async () => {
    let body: unknown;
    server.use(
      http.put(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions`, async ({ request }) => {
        body = await request.json();
        return envelope({ id: 'perm-1', pageId: PAGE_ID, subjectType: 'USER', subjectId: 'user-2',
          role: 'FULL', grantedBy: 'user-1', createdAt: '2026-08-25T00:00:00.000Z' });
      }),
    );
    renderWithProviders(
      <InternalPermissionSection
        members={[member]} pageId={PAGE_ID} permissions={[permission('VIEW')]} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Vai trò của Nguyễn Văn A: Chỉ xem' }));
    await user.click(await screen.findByRole('menuitem', { name: /Toàn quyền/ }));

    await waitFor(() => expect(body).toMatchObject({
      subjectId: 'user-2', role: 'FULL', subjectType: 'USER',
    }));
    expect(toast.success).toHaveBeenCalledWith('Đã đổi vai trò của Nguyễn Văn A');
  });

  it('gỡ quyền ngay trong menu vai trò', async () => {
    let deleted = '';
    server.use(
      http.delete(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions/:permissionId`, ({ params }) => {
        deleted = String(params.permissionId);
        return envelope({ revoked: true });
      }),
    );
    renderWithProviders(
      <InternalPermissionSection
        members={[member]} pageId={PAGE_ID} permissions={[permission('EDIT')]} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Vai trò của Nguyễn Văn A: Chỉnh sửa' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Gỡ quyền truy cập' }));

    await waitFor(() => expect(deleted).toBe('perm-1'));
  });
});
