import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import {
  useChangeRequestsInfinite,
  useCreateChangeRequest,
} from '../../hooks/useChangeRequests';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { ChangeRequestSummary } from '../../types';
import { ChangeRequestsTab } from './ChangeRequestsTab';

vi.mock('./ChangeRequestDetailModal', () => ({
  ChangeRequestDetailModal: ({ projectId }: { projectId: string }) => (
    <div data-testid="change-request-detail-modal">{projectId}</div>
  ),
}));

vi.mock('../../hooks/useChangeRequests', () => ({
  useChangeRequestsInfinite: vi.fn(),
  useCreateChangeRequest: vi.fn(),
}));

vi.mock('../../services/commitments.api', () => ({
  commitmentsApi: { list: vi.fn() },
}));

vi.mock('../../stores/tasks-ui.store', () => ({
  useTasksUIStore: vi.fn(),
}));

const createChangeRequest = vi.fn();
const openChangeRequestDetail = vi.fn();

const changeRequest: ChangeRequestSummary = {
  id: 'change-request-1',
  projectId: 'project-1',
  commitmentId: 'commitment-1',
  title: 'Bổ sung báo cáo doanh thu',
  impact: 'Tăng phạm vi triển khai và thời gian kiểm thử',
  estimateHours: 12,
  cost: '1500000',
  currency: 'VND',
  timelineShiftDays: 3,
  status: 'INTERNAL_APPROVED',
  internalApprovedByUserId: 'user-1',
  internalApprovedAt: '2026-09-20T08:00:00.000Z',
  sentAt: null,
  clientApprovedByUserId: null,
  clientApprovedOnBehalfOf: null,
  clientApprovedAt: null,
  rejectedAt: null,
  rejectReason: null,
  createdBy: 'user-1',
  version: 1,
  createdAt: '2026-09-20T07:00:00.000Z',
  updatedAt: '2026-09-20T08:00:00.000Z',
  sourceRefs: [],
};

function changeRequestsResult(items: ChangeRequestSummary[]) {
  return {
    data: {
      pages: [
        {
          data: items,
          meta: {
            page: 1,
            limit: 20,
            total: items.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      ],
      pageParams: [1],
    },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as ReturnType<typeof useChangeRequestsInfinite>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useChangeRequestsInfinite).mockReturnValue(
    changeRequestsResult([changeRequest]),
  );
  vi.mocked(useCreateChangeRequest).mockReturnValue({
    mutate: createChangeRequest,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateChangeRequest>);
  vi.mocked(commitmentsApi.list).mockResolvedValue({
    data: [
      {
        id: 'commitment-1',
        title: 'Cam kết báo cáo',
        deliveryStatus: 'IN_PROGRESS',
        scopeStatus: 'IN_SCOPE',
        ownerId: 'user-1',
        dueAt: null,
        deliveredAt: null,
        version: 1,
        createdAt: '2026-09-19T07:00:00.000Z',
        updatedAt: '2026-09-19T07:00:00.000Z',
        contact: null,
        risks: [],
        isReadyToDeliver: false,
      },
    ],
    meta: { total: 1 },
  });
  vi.mocked(useTasksUIStore).mockImplementation((selector) =>
    selector({ openChangeRequestDetail } as never),
  );
});

describe('ChangeRequestsTab', () => {
  it('hiển thị danh sách yêu cầu thay đổi và trạng thái', () => {
    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    expect(screen.getByText('Bổ sung báo cáo doanh thu')).toBeInTheDocument();
    expect(screen.getByText('Đã duyệt nội bộ')).toBeInTheDocument();
    expect(
      screen.getByText('Tăng phạm vi triển khai và thời gian kiểm thử'),
    ).toBeInTheDocument();
  });

  it('lọc danh sách theo trạng thái được chọn', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(
      await screen.findByRole('option', { name: 'Đã duyệt nội bộ' }),
    );

    await waitFor(() =>
      expect(useChangeRequestsInfinite).toHaveBeenLastCalledWith('project-1', {
        status: 'INTERNAL_APPROVED',
      }),
    );
  });

  it('hiển thị trạng thái trống và hành động tạo đầu tiên', () => {
    vi.mocked(useChangeRequestsInfinite).mockReturnValue(
      changeRequestsResult([]),
    );

    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    expect(
      screen.getByText('Chưa có yêu cầu thay đổi nào.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tạo yêu cầu đầu tiên' }),
    ).toBeInTheDocument();
  });

  it('tạo yêu cầu thay đổi với các trường đã nhập', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Tạo yêu cầu thay đổi' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      '  Thêm báo cáo tuần  ',
    );
    await user.type(
      within(dialog).getByLabelText(/^Tác động/),
      '  Cần thêm thời gian kiểm thử  ',
    );
    await user.type(
      within(dialog).getByLabelText('Số giờ ước tính (không bắt buộc)'),
      '16',
    );
    await user.type(
      within(dialog).getByLabelText('Chi phí ước tính (không bắt buộc)'),
      '2500000',
    );
    await user.type(
      within(dialog).getByLabelText('Số ngày dịch tiến độ (không bắt buộc)'),
      '4',
    );
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(
      await screen.findByRole('option', { name: 'Cam kết báo cáo' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Tạo' }));

    expect(createChangeRequest).toHaveBeenCalledWith(
      {
        title: 'Thêm báo cáo tuần',
        impact: 'Cần thêm thời gian kiểm thử',
        estimateHours: 16,
        cost: 2500000,
        timelineShiftDays: 4,
        commitmentId: 'commitment-1',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  }, 10000);

  it('mở chi tiết yêu cầu thay đổi được chọn', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: /Bổ sung báo cáo doanh thu/ }),
    );

    expect(openChangeRequestDetail).toHaveBeenCalledWith('change-request-1');
  });

  it('mount modal chi tiết cho dự án hiện tại', () => {
    renderWithProviders(<ChangeRequestsTab projectId="project-1" />);

    expect(screen.getByTestId('change-request-detail-modal')).toHaveTextContent(
      'project-1',
    );
  });
});
