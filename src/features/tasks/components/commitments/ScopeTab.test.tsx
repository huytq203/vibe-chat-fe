import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import {
  useAddScopeItem,
  useProjectScope,
  useRemoveScopeItem,
  useUpdateScopeDocument,
  useUpdateScopeItem,
} from '../../hooks/useScope';
import { ScopeTab } from './ScopeTab';
import { useProjectRole } from '../../hooks/useProjectRole';

vi.mock('../../hooks/useProjectRole', () => ({ useProjectRole: vi.fn() }));

vi.mock('../../hooks/useScope', () => ({
  useProjectScope: vi.fn(),
  useUpdateScopeDocument: vi.fn(),
  useAddScopeItem: vi.fn(),
  useUpdateScopeItem: vi.fn(),
  useRemoveScopeItem: vi.fn(),
}));

const updateDocument = vi.fn();
const addItem = vi.fn();
const updateItem = vi.fn();
const removeItem = vi.fn();

function mutationResult(mutate: ReturnType<typeof vi.fn>) {
  return { mutate, isPending: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProjectRole).mockReturnValue({ canManage: true } as ReturnType<typeof useProjectRole>);
  vi.mocked(useProjectScope).mockReturnValue({
    data: {
      projectId: 'proj-1',
      rawDocument: 'Phạm vi ban đầu',
      version: 7,
      items: [
        {
          id: 'item-1',
          title: 'Đăng nhập',
          description: 'Đăng nhập bằng SSO',
          status: 'APPROVED',
          position: 0,
          originChangeRequestId: null,
        },
      ],
    },
    isPending: false,
  } as ReturnType<typeof useProjectScope>);
  vi.mocked(useUpdateScopeDocument).mockReturnValue(
    mutationResult(updateDocument) as unknown as ReturnType<
      typeof useUpdateScopeDocument
    >,
  );
  vi.mocked(useAddScopeItem).mockReturnValue(
    mutationResult(addItem) as unknown as ReturnType<typeof useAddScopeItem>,
  );
  vi.mocked(useUpdateScopeItem).mockReturnValue(
    mutationResult(updateItem) as unknown as ReturnType<
      typeof useUpdateScopeItem
    >,
  );
  vi.mocked(useRemoveScopeItem).mockReturnValue(
    mutationResult(removeItem) as unknown as ReturnType<
      typeof useRemoveScopeItem
    >,
  );
});

describe('ScopeTab', () => {
  it('nên ẩn các nút ghi khi user không có quyền quản lý', () => {
    vi.mocked(useProjectRole).mockReturnValue({ canManage: false } as ReturnType<typeof useProjectRole>);
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    expect(screen.queryByRole('button', { name: 'Lưu tài liệu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm hạng mục' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa Đăng nhập' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xoá Đăng nhập' })).not.toBeInTheDocument();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('nên hiện các nút ghi khi user có quyền quản lý', () => {
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    expect(screen.getByRole('button', { name: 'Lưu tài liệu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm hạng mục' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xoá Đăng nhập' })).toBeInTheDocument();
  });
  it('nên hiện tài liệu và danh sách hạng mục phạm vi', () => {
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    expect(
      screen.getByLabelText('Tài liệu phạm vi (SOW/hợp đồng)'),
    ).toHaveValue('Phạm vi ban đầu');
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập bằng SSO')).toBeInTheDocument();
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
  });

  it('nên lưu tài liệu với phiên bản mới nhất đang hiển thị', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScopeTab projectId="proj-1" />);
    const textarea = screen.getByLabelText(
      'Tài liệu phạm vi (SOW/hợp đồng)',
    );
    const saveButton = screen.getByRole('button', { name: 'Lưu tài liệu' });

    expect(saveButton).toBeDisabled();
    await user.clear(textarea);
    await user.type(textarea, 'Phạm vi đã cập nhật');
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(updateDocument).toHaveBeenCalledWith({
      rawDocument: 'Phạm vi đã cập nhật',
      version: 7,
    });
  });

  it('nên thêm hạng mục với nội dung đã nhập và phiên bản hiện tại', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Thêm hạng mục' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/^Tên hạng mục/),
      'Báo cáo',
    );
    await user.type(
      within(dialog).getByLabelText('Mô tả (không bắt buộc)'),
      'Xuất báo cáo PDF',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Thêm' }));

    expect(addItem).toHaveBeenCalledWith(
      {
        title: 'Báo cáo',
        description: 'Xuất báo cáo PDF',
        version: 7,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('nên sửa trạng thái hạng mục với phiên bản hiện tại', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Sửa Đăng nhập' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Tên hạng mục/)).toHaveValue(
      'Đăng nhập',
    );
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Giai đoạn 2' }));
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(updateItem).toHaveBeenCalledWith(
      {
        itemId: 'item-1',
        input: {
          title: 'Đăng nhập',
          description: 'Đăng nhập bằng SSO',
          status: 'PHASE_2',
          version: 7,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('nên xoá hạng mục với phiên bản hiện tại sau khi xác nhận', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScopeTab projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: 'Xoá Đăng nhập' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Xoá' }));

    expect(removeItem).toHaveBeenCalledWith(
      { itemId: 'item-1', version: 7 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
