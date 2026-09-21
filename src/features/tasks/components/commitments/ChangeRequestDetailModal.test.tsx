import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import {
  useChangeRequestDetail,
  useRemoveChangeRequestSourceRef,
  useTransitionChangeRequest,
  useUpdateChangeRequest,
} from '../../hooks/useChangeRequests';
import { changeRequestsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { ChangeRequestSummary } from '../../types';
import { ChangeRequestDetailModal } from './ChangeRequestDetailModal';

vi.mock('../../hooks/useChangeRequests', () => ({
  useChangeRequestDetail: vi.fn(),
  useUpdateChangeRequest: vi.fn(),
  useTransitionChangeRequest: vi.fn(),
  useRemoveChangeRequestSourceRef: vi.fn(),
}));

vi.mock('../../stores/tasks-ui.store', () => ({
  useTasksUIStore: vi.fn(),
}));

vi.mock('../../services/commitments.api', () => ({
  changeRequestsApi: {
    getSourceRefContent: vi.fn(),
  },
}));

const closeChangeRequestDetail = vi.fn();
const updateChangeRequest = vi.fn();
const transitionChangeRequest = vi.fn();
const removeSourceRef = vi.fn();
let selectedChangeRequestId: string | null = 'change-request-1';

const changeRequest: ChangeRequestSummary = {
  id: 'change-request-1',
  projectId: 'project-1',
  commitmentId: 'commitment-1',
  title: 'Bổ sung báo cáo doanh thu',
  impact: 'Tăng phạm vi triển khai và thời gian kiểm thử.',
  estimateHours: 12,
  cost: '1500000',
  currency: 'VND',
  timelineShiftDays: 3,
  status: 'DRAFT',
  internalApprovedByUserId: null,
  internalApprovedAt: null,
  sentAt: '2026-09-20T08:00:00.000Z',
  clientApprovedByUserId: null,
  clientApprovedOnBehalfOf: 'Minh Anh',
  clientApprovedAt: null,
  rejectedAt: null,
  rejectReason: 'Chưa đủ ngân sách',
  createdBy: 'user-1',
  version: 4,
  createdAt: '2026-09-19T08:00:00.000Z',
  updatedAt: '2026-09-20T08:00:00.000Z',
  sourceRefs: [
    {
      id: 'ref-1',
      targetType: 'CHANGE_REQUEST',
      targetId: 'change-request-1',
      type: 'CHAT_MESSAGE',
      conversationId: '11111111-1111-4111-8111-111111111111',
      messageIds: ['22222222-2222-4222-8222-222222222222'],
      meetingId: null,
      noteId: null,
      createdBy: 'user-1',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
  ],
};

function mockDetail(data: ChangeRequestSummary | undefined) {
  vi.mocked(useChangeRequestDetail).mockReturnValue({
    data,
    isPending: false,
  } as ReturnType<typeof useChangeRequestDetail>);
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedChangeRequestId = 'change-request-1';
  mockDetail(changeRequest);
  vi.mocked(useUpdateChangeRequest).mockReturnValue({
    mutate: updateChangeRequest,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateChangeRequest>);
  vi.mocked(useTransitionChangeRequest).mockReturnValue({
    mutate: transitionChangeRequest,
    isPending: false,
  } as unknown as ReturnType<typeof useTransitionChangeRequest>);
  vi.mocked(useRemoveChangeRequestSourceRef).mockReturnValue({
    mutate: removeSourceRef,
    isPending: false,
  } as unknown as ReturnType<typeof useRemoveChangeRequestSourceRef>);
  vi.mocked(useTasksUIStore).mockImplementation((selector) =>
    selector({ selectedChangeRequestId, closeChangeRequestDetail } as never),
  );
  vi.mocked(changeRequestsApi.getSourceRefContent).mockResolvedValue([
    {
      uuid: '22222222-2222-4222-8222-222222222222',
      senderId: 'user-2',
      previewText: 'Khách hàng đề nghị bổ sung báo cáo doanh thu.',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
  ]);
});

describe('ChangeRequestDetailModal', () => {
  it('không mở hộp thoại khi chưa chọn yêu cầu thay đổi', () => {
    selectedChangeRequestId = null;

    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useChangeRequestDetail).toHaveBeenCalledWith('');
  });

  it('hiển thị đầy đủ thông tin chi tiết của yêu cầu thay đổi', () => {
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bổ sung báo cáo doanh thu')).toBeInTheDocument();
    expect(screen.getByText('Nháp')).toBeInTheDocument();
    expect(
      screen.getByText('Tăng phạm vi triển khai và thời gian kiểm thử.'),
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1500000 VND')).toBeInTheDocument();
    expect(screen.getByText('3 ngày')).toBeInTheDocument();
    expect(screen.getByText('commitment-1')).toBeInTheDocument();
    expect(screen.getByText('20/9/2026')).toBeInTheDocument();
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
    expect(screen.getByText('Chưa đủ ngân sách')).toBeInTheDocument();
    expect(screen.getByText('Tin nhắn chat')).toBeInTheDocument();
  });

  it('tải đúng nội dung của nguồn tin nhắn được chọn', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Xem nội dung' }));

    await waitFor(() =>
      expect(changeRequestsApi.getSourceRefContent).toHaveBeenCalledWith(
        'change-request-1',
        'ref-1',
      ),
    );
    expect(
      await screen.findByText(
        'Khách hàng đề nghị bổ sung báo cáo doanh thu.',
      ),
    ).toBeInTheDocument();
  });

  it('mở biểu mẫu sửa với dữ liệu hiện tại và gửi nội dung đã cập nhật', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Sửa yêu cầu thay đổi' }),
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Sửa yêu cầu thay đổi',
    });
    expect(within(dialog).getByLabelText(/^Tiêu đề/)).toHaveValue(
      'Bổ sung báo cáo doanh thu',
    );
    expect(within(dialog).getByLabelText(/^Tác động/)).toHaveValue(
      'Tăng phạm vi triển khai và thời gian kiểm thử.',
    );
    expect(within(dialog).getByLabelText('Số giờ ước tính')).toHaveValue(12);
    expect(within(dialog).getByLabelText('Chi phí ước tính')).toHaveValue(
      1500000,
    );
    expect(within(dialog).getByLabelText('Số ngày dịch tiến độ')).toHaveValue(
      3,
    );

    const titleInput = within(dialog).getByLabelText(/^Tiêu đề/);
    await user.clear(titleInput);
    await user.type(titleInput, 'Bổ sung báo cáo doanh thu tuần');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(useUpdateChangeRequest).toHaveBeenCalledWith(
      'project-1',
      'change-request-1',
    );
    expect(updateChangeRequest).toHaveBeenCalledWith(
      {
        title: 'Bổ sung báo cáo doanh thu tuần',
        impact: 'Tăng phạm vi triển khai và thời gian kiểm thử.',
        estimateHours: 12,
        cost: 1500000,
        timelineShiftDays: 3,
        version: 4,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('chỉ hiện người xác nhận khi chuyển sang khách đã duyệt', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Chuyển trạng thái' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Chuyển trạng thái yêu cầu thay đổi',
    });
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(
      await screen.findByRole('option', { name: 'Khách đã duyệt' }),
    );

    expect(
      within(dialog).getByLabelText(/^Người xác nhận phía khách/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(/^Lý do từ chối/),
    ).not.toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/^Người xác nhận phía khách/),
      '  Minh Anh  ',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    expect(transitionChangeRequest).toHaveBeenCalledWith(
      { to: 'CLIENT_APPROVED', version: 4, onBehalfOf: 'Minh Anh' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('chỉ hiện lý do khi chuyển sang bị từ chối', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Chuyển trạng thái' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Chuyển trạng thái yêu cầu thay đổi',
    });
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(
      await screen.findByRole('option', { name: 'Bị từ chối' }),
    );

    expect(
      within(dialog).getByLabelText(/^Lý do từ chối/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(/^Người xác nhận phía khách/),
    ).not.toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/^Lý do từ chối/),
      '  Vượt ngân sách  ',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    expect(useTransitionChangeRequest).toHaveBeenCalledWith(
      'project-1',
      'change-request-1',
    );
    expect(transitionChangeRequest).toHaveBeenCalledWith(
      { to: 'REJECTED', version: 4, reason: 'Vượt ngân sách' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('gỡ nguồn tham chiếu khỏi yêu cầu thay đổi', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Gỡ nguồn tham chiếu' }),
    );

    expect(useRemoveChangeRequestSourceRef).toHaveBeenCalledWith(
      'change-request-1',
    );
    expect(removeSourceRef).toHaveBeenCalledWith('ref-1');
  });

  it.each(['CLIENT_APPROVED', 'REJECTED'] as const)(
    'ẩn nút chuyển trạng thái khi yêu cầu thay đổi ở trạng thái kết thúc %s',
    (status) => {
      mockDetail({ ...changeRequest, status });

      renderWithProviders(<ChangeRequestDetailModal projectId="project-1" />);

      expect(
        screen.queryByRole('button', { name: 'Chuyển trạng thái' }),
      ).not.toBeInTheDocument();
    },
  );
});
