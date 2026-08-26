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

describe('InternalPermissionSection — xử lý member.user = null', () => {
  it('member.user = null nhưng có profile từ API → hiện tên từ profile, không phải "Người dùng Halo"', async () => {
    // Đây là trường hợp bug: member là workspace member nhưng UserSnapshot rỗng,
    // nên member.user = null. Trước đây chỉ tra hồ sơ cho người ngoài members,
    // nên id này bị bỏ qua, không lấy được tên từ profile, rơi xuống "Người dùng Halo".
    const memberWithNullUser: WorkspaceMember = {
      id: 'wm-2', workspaceId: 'ws-1', userId: 'user-4', role: 'MEMBER',
      invitedBy: null, joinedAt: '2026-08-25T00:00:00.000Z',
      user: null, // UserSnapshot trống
    };

    const perm: EffectivePagePermission = {
      permission: { id: 'perm-2', pageId: PAGE_ID, subjectType: 'USER', subjectId: 'user-4',
        role: 'VIEW', grantedBy: 'user-1', createdAt: '2026-08-25T00:00:00.000Z' },
      inherited: false, sourcePageId: PAGE_ID, sourcePageTitle: 'Trang',
    };

    let profileFetched = false;
    server.use(
      http.get(`${VIBE_URL}/api/v1/users/:id`, ({ params }) => {
        if (params.id === 'user-4') {
          profileFetched = true;
          return envelope({
            id: 'user-4', username: 'duydk', displayName: 'Duy Đặng Khoa',
            avatarUrl: null, isBot: false, friendship: 'NONE',
          });
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    renderWithProviders(
      <InternalPermissionSection
        members={[memberWithNullUser]} pageId={PAGE_ID} permissions={[perm]} />,
    );

    // Phải gọi API để lấy profile
    await waitFor(() => {
      expect(profileFetched).toBe(true);
    });

    // Phải hiện tên từ profile "Duy Đặng Khoa", không phải "Người dùng Halo"
    expect(screen.getByText('Duy Đặng Khoa')).toBeInTheDocument();
  });

  it('member.user.displayName có giá trị → không tra hồ sơ, hiện tên từ member', async () => {
    let profileRequests = 0;
    server.use(
      http.get(`${VIBE_URL}/api/v1/users/:id`, () => {
        profileRequests += 1;
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    renderWithProviders(
      <InternalPermissionSection
        members={[member]} pageId={PAGE_ID} permissions={[permission('VIEW')]} />,
    );

    // Không nên gọi API vì member đã có displayName
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(profileRequests).toBe(0);

    // Hiện tên từ member
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
  });

  it('không có nguồn nào có tên → hiện "Người dùng Halo"', async () => {
    const memberWithoutName: WorkspaceMember = {
      id: 'wm-3', workspaceId: 'ws-1', userId: 'user-5', role: 'MEMBER',
      invitedBy: null, joinedAt: '2026-08-25T00:00:00.000Z',
      user: null, // Không có tên từ member
    };

    const perm: EffectivePagePermission = {
      permission: { id: 'perm-3', pageId: PAGE_ID, subjectType: 'USER', subjectId: 'user-5',
        role: 'VIEW', grantedBy: 'user-1', createdAt: '2026-08-25T00:00:00.000Z' },
      inherited: false, sourcePageId: PAGE_ID, sourcePageTitle: 'Trang',
    };

    server.use(
      http.get(`${VIBE_URL}/api/v1/users/:id`, ({ params }) => {
        if (params.id === 'user-5') {
          // Profile không có displayName cũng không có username
          return envelope({
            id: 'user-5', username: '', displayName: null,
            avatarUrl: null, isBot: false, friendship: 'NONE',
          });
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    renderWithProviders(
      <InternalPermissionSection
        members={[memberWithoutName]} pageId={PAGE_ID} permissions={[perm]} />,
    );

    // Hiện chuỗi dự phòng "Người dùng Halo"
    await waitFor(() => {
      expect(screen.getByText('Người dùng Halo')).toBeInTheDocument();
    });
  });
});
