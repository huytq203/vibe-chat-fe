import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import {
  useAddContact,
  useProjectClient,
  useRemoveContact,
  useUpdateContact,
  useUpsertClient,
  useInviteClientContact,
} from '../../hooks/useClient';
import { ClientTab } from './ClientTab';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useUserSearch } from '../../hooks/useUserSearch';

vi.mock('../../hooks/useProjectRole', () => ({ useProjectRole: vi.fn() }));
vi.mock('../../hooks/useUserSearch', () => ({ useUserSearch: vi.fn() }));

vi.mock('../../hooks/useClient', () => ({
  useProjectClient: vi.fn(),
  useUpsertClient: vi.fn(),
  useAddContact: vi.fn(),
  useUpdateContact: vi.fn(),
  useRemoveContact: vi.fn(),
  useInviteClientContact: vi.fn(),
}));

const upsert = vi.fn();
const addContact = vi.fn();
const updateContact = vi.fn();
const removeContact = vi.fn();
const inviteClientContact = vi.fn();

function mutationResult(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProjectRole).mockReturnValue({ role: 'OWNER', canManage: true } as ReturnType<typeof useProjectRole>);
  vi.mocked(useUserSearch).mockReturnValue({ data: [{ userId: 'user-2', displayName: 'Bình', email: 'binh@example.com', avatarUrl: null }], isPending: false } as ReturnType<typeof useUserSearch>);
  vi.mocked(useInviteClientContact).mockReturnValue(mutationResult(inviteClientContact) as unknown as ReturnType<typeof useInviteClientContact>);
  vi.mocked(useProjectClient).mockReturnValue({
    data: {
      projectId: 'proj-1',
      name: 'ACME',
      contacts: [
        {
          id: 'c1',
          userId: null,
          name: 'Alex Nguyen',
          email: 'alex@example.com',
          title: 'Product Manager',
          isPrimary: true,
          isDeleted: false,
        },
      ],
    },
    isPending: false,
  } as ReturnType<typeof useProjectClient>);
  vi.mocked(useUpsertClient).mockReturnValue(
    mutationResult(upsert) as unknown as ReturnType<typeof useUpsertClient>,
  );
  vi.mocked(useAddContact).mockReturnValue(
    mutationResult(addContact) as unknown as ReturnType<typeof useAddContact>,
  );
  vi.mocked(useUpdateContact).mockReturnValue(
    mutationResult(updateContact) as unknown as ReturnType<typeof useUpdateContact>,
  );
  vi.mocked(useRemoveContact).mockReturnValue(
    mutationResult(removeContact) as unknown as ReturnType<typeof useRemoveContact>,
  );
});

describe('ClientTab', () => {
  it('nên hiện nút mời cho contact chưa liên kết khi user là OWNER', () => {
    renderWithProviders(<ClientTab projectId="proj-1" />);
    expect(screen.getByRole('button', { name: 'Mời làm khách hàng' })).toBeInTheDocument();
  });

  it('nên ẩn nút mời khi user là ADMIN', () => {
    vi.mocked(useProjectRole).mockReturnValue({ role: 'ADMIN', canManage: true } as ReturnType<typeof useProjectRole>);
    renderWithProviders(<ClientTab projectId="proj-1" />);
    expect(screen.queryByRole('button', { name: 'Mời làm khách hàng' })).not.toBeInTheDocument();
  });

  it('nên hiện badge đã liên kết khi contact có userId', () => {
    vi.mocked(useProjectClient).mockReturnValue({
      data: { projectId: 'proj-1', name: 'ACME', contacts: [{ id: 'c1', userId: 'user-2', name: 'Alex Nguyen', email: null, title: null, isPrimary: false, isDeleted: false }] },
      isPending: false,
    } as ReturnType<typeof useProjectClient>);
    renderWithProviders(<ClientTab projectId="proj-1" />);
    expect(screen.getByText('Đã liên kết tài khoản')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mời làm khách hàng' })).not.toBeInTheDocument();
  });

  it('nên gửi lời mời CLIENT cho contact khi chọn user Halo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientTab projectId="proj-1" />);
    await user.click(screen.getByRole('button', { name: 'Mời làm khách hàng' }));
    await user.type(screen.getByRole('textbox', { name: 'Tìm người dùng để mời' }), 'Bi');
    await user.click(await screen.findByRole('button', { name: /Bình/ }));
    expect(inviteClientContact).toHaveBeenCalledWith(
      { userId: 'user-2', contactId: 'c1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
  it('nên ẩn các nút ghi khi user không có quyền quản lý', () => {
    vi.mocked(useProjectRole).mockReturnValue({ canManage: false } as ReturnType<typeof useProjectRole>);
    renderWithProviders(<ClientTab projectId="proj-1" />);

    expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm người liên hệ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa Alex Nguyen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xoá Alex Nguyen' })).not.toBeInTheDocument();
    expect(screen.getByText('Alex Nguyen')).toBeInTheDocument();
  });

  it('nên hiện các nút ghi khi user có quyền quản lý', () => {
    renderWithProviders(<ClientTab projectId="proj-1" />);

    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm người liên hệ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa Alex Nguyen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xoá Alex Nguyen' })).toBeInTheDocument();
  });
  it('nên hiện tên khách hàng và danh sách người liên hệ', () => {
    renderWithProviders(<ClientTab projectId="proj-1" />);

    expect(screen.getByLabelText('Tên khách hàng')).toHaveValue('ACME');
    expect(screen.getByText('Alex Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Product Manager · alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Liên hệ chính')).toBeInTheDocument();
  });

  it('nên hiện form tạo khách hàng khi dự án chưa có khách hàng', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjectClient).mockReturnValue({
      data: null,
      isPending: false,
    } as ReturnType<typeof useProjectClient>);
    renderWithProviders(<ClientTab projectId="proj-1" />);

    await user.type(screen.getByLabelText('Tên khách hàng'), 'ACME');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(upsert).toHaveBeenCalledWith('ACME');
    expect(screen.queryByText('Người liên hệ')).not.toBeInTheDocument();
  });

  it('nên thêm người liên hệ với thông tin đã nhập', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Thêm người liên hệ' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Tên/), 'Taylor');
    await user.type(
      within(dialog).getByLabelText('Email (không bắt buộc)'),
      'taylor@example.com',
    );
    await user.type(
      within(dialog).getByLabelText('Chức danh (không bắt buộc)'),
      'Designer',
    );
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Liên hệ chính' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Thêm' }));

    expect(addContact).toHaveBeenCalledWith(
      {
        name: 'Taylor',
        email: 'taylor@example.com',
        title: 'Designer',
        isPrimary: true,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('nên điền sẵn và cập nhật người liên hệ đang sửa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Sửa Alex Nguyen' }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/^Tên/);

    expect(nameInput).toHaveValue('Alex Nguyen');
    expect(
      within(dialog).getByLabelText('Email (không bắt buộc)'),
    ).toHaveValue('alex@example.com');
    expect(
      within(dialog).getByLabelText('Chức danh (không bắt buộc)'),
    ).toHaveValue('Product Manager');
    expect(
      within(dialog).getByRole('checkbox', { name: 'Liên hệ chính' }),
    ).toBeChecked();

    await user.clear(nameInput);
    await user.type(nameInput, 'Alex Updated');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(updateContact).toHaveBeenCalledWith(
      {
        contactId: 'c1',
        input: {
          name: 'Alex Updated',
          email: 'alex@example.com',
          title: 'Product Manager',
          isPrimary: true,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('nên xoá người liên hệ sau khi xác nhận', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Xoá Alex Nguyen' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Xoá' }));

    expect(removeContact).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
