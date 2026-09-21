import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { useProjectClient } from '../../hooks/useClient';
import { useMembers } from '../../hooks/useMembers';
import {
  useAddEvidence,
  useCommitmentDetail,
  useRemoveSourceRef,
  useUpdateCommitment,
} from '../../hooks/useCommitments';
import { useProjectScope } from '../../hooks/useScope';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { CommitmentDetail } from '../../types';
import { CommitmentDetailModal } from './CommitmentDetailModal';

vi.mock('../../hooks/useCommitments', () => ({
  useCommitmentDetail: vi.fn(),
  useUpdateCommitment: vi.fn(),
  useAddEvidence: vi.fn(),
  useRemoveSourceRef: vi.fn(),
}));

vi.mock('../../hooks/useClient', () => ({
  useProjectClient: vi.fn(),
}));

vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(),
}));

vi.mock('../../hooks/useScope', () => ({
  useProjectScope: vi.fn(),
}));

vi.mock('../../stores/tasks-ui.store', () => ({
  useTasksUIStore: vi.fn(),
}));

vi.mock('../../services/commitments.api', () => ({
  commitmentsApi: {
    getSourceRefContent: vi.fn(),
  },
}));

const closeCommitmentDetail = vi.fn();
const updateCommitment = vi.fn();
const addEvidence = vi.fn();
const removeSourceRef = vi.fn();
let selectedCommitmentId: string | null = 'commitment-1';

const commitmentDetail: CommitmentDetail = {
  id: 'commitment-1',
  title: 'Bàn giao bản beta',
  description: 'Hoàn thiện và bàn giao bản beta cho khách hàng.',
  deliveryStatus: 'READY',
  scopeStatus: 'IN_SCOPE',
  ownerId: 'user-1',
  requestedByContactId: 'contact-1',
  promisedAt: '2026-09-18T08:00:00.000Z',
  dueAt: '2026-09-25T08:00:00.000Z',
  deliveredAt: '2026-09-20T08:00:00.000Z',
  scopeItemId: null,
  version: 2,
  createdAt: '2026-09-17T08:00:00.000Z',
  updatedAt: '2026-09-20T08:00:00.000Z',
  contact: {
    id: 'contact-1',
    userId: null,
    name: 'Minh Anh',
    email: 'minh.anh@example.com',
    title: 'Product Owner',
    isPrimary: true,
    isDeleted: false,
  },
  risks: ['WAITING_CLIENT'],
  isReadyToDeliver: true,
  tasks: [
    {
      id: 'task-1',
      title: 'Kiểm thử luồng thanh toán',
      columnId: 'column-1',
      completedAt: '2026-09-20T07:00:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'evidence-1',
      commitmentId: 'commitment-1',
      milestone: 'TESTED',
      type: 'URL',
      url: 'https://example.com/test-report',
      note: null,
      createdBy: 'user-1',
      createdAt: '2026-09-20T08:00:00.000Z',
    },
  ],
  sourceRefs: [
    {
      id: 'ref-1',
      targetType: 'COMMITMENT',
      targetId: 'commitment-1',
      type: 'CHAT_MESSAGE',
      conversationId: '11111111-1111-4111-8111-111111111111',
      messageIds: ['22222222-2222-4222-8222-222222222222'],
      meetingId: null,
      noteId: null,
      createdBy: 'user-1',
      createdAt: '2026-09-18T08:00:00.000Z',
    },
  ],
  openSentChangeRequests: 0,
};

function mockDetail(data: CommitmentDetail | undefined) {
  vi.mocked(useCommitmentDetail).mockReturnValue({
    data,
    isPending: false,
  } as ReturnType<typeof useCommitmentDetail>);
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedCommitmentId = 'commitment-1';
  mockDetail(commitmentDetail);
  vi.mocked(useMembers).mockReturnValue({
    data: [
      {
        userId: 'user-1',
        projectId: 'project-1',
        role: 'MEMBER',
        displayName: 'Nguyễn An',
        avatarUrl: null,
        joinedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
  } as ReturnType<typeof useMembers>);
  vi.mocked(useProjectClient).mockReturnValue({
    data: {
      projectId: 'project-1',
      name: 'Khách hàng ACME',
      contacts: [commitmentDetail.contact],
    },
  } as ReturnType<typeof useProjectClient>);
  vi.mocked(useProjectScope).mockReturnValue({
    data: {
      projectId: 'project-1',
      rawDocument: null,
      version: 1,
      items: [],
    },
  } as unknown as ReturnType<typeof useProjectScope>);
  vi.mocked(useUpdateCommitment).mockReturnValue({
    mutate: updateCommitment,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateCommitment>);
  vi.mocked(useAddEvidence).mockReturnValue({
    mutate: addEvidence,
    isPending: false,
  } as unknown as ReturnType<typeof useAddEvidence>);
  vi.mocked(useRemoveSourceRef).mockReturnValue({
    mutate: removeSourceRef,
    isPending: false,
  } as unknown as ReturnType<typeof useRemoveSourceRef>);
  vi.mocked(useTasksUIStore).mockImplementation((selector) =>
    selector({ selectedCommitmentId, closeCommitmentDetail } as never),
  );
  vi.mocked(commitmentsApi.getSourceRefContent).mockResolvedValue([
    {
      uuid: '22222222-2222-4222-8222-222222222222',
      senderId: 'user-2',
      previewText: 'Khách hàng xác nhận nội dung bàn giao.',
      createdAt: '2026-09-18T08:00:00.000Z',
    },
  ]);
});

describe('CommitmentDetailModal', () => {
  it('không mở hộp thoại khi chưa chọn cam kết', () => {
    selectedCommitmentId = null;

    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useCommitmentDetail).toHaveBeenCalledWith('');
  });

  it('hiển thị đầy đủ thông tin chi tiết của cam kết', () => {
    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bàn giao bản beta')).toBeInTheDocument();
    expect(screen.getByText('Sẵn sàng bàn giao')).toBeInTheDocument();
    expect(screen.getByText('Trong phạm vi')).toBeInTheDocument();
    expect(screen.getByText('Đã sẵn sàng bàn giao')).toBeInTheDocument();
    expect(screen.getByText('Chờ khách phản hồi')).toBeInTheDocument();
    expect(
      screen.getByText('Hoàn thiện và bàn giao bản beta cho khách hàng.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
    expect(screen.getByText('18/9/2026')).toBeInTheDocument();
    expect(screen.getByText('25/9/2026')).toBeInTheDocument();
    expect(screen.getByText('20/9/2026')).toBeInTheDocument();
    expect(screen.getByText('Kiểm thử luồng thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('Đã test')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'https://example.com/test-report' }),
    ).toHaveAttribute('href', 'https://example.com/test-report');
    expect(screen.getByText('Tin nhắn chat')).toBeInTheDocument();
  });

  it('hiển thị thông báo cho các mục chưa có dữ liệu', () => {
    mockDetail({
      ...commitmentDetail,
      tasks: [],
      evidence: [],
      sourceRefs: [],
    });

    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    expect(screen.getByText('Chưa liên kết task nào.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có bằng chứng.')).toBeInTheDocument();
    expect(screen.getByText('Chưa gắn nguồn tham chiếu.')).toBeInTheDocument();
  });

  it('tải đúng nội dung của nguồn tin nhắn được chọn', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Xem nội dung' }));

    await waitFor(() =>
      expect(commitmentsApi.getSourceRefContent).toHaveBeenCalledWith(
        'commitment-1',
        'ref-1',
      ),
    );
    expect(
      await screen.findByText('Khách hàng xác nhận nội dung bàn giao.'),
    ).toBeInTheDocument();
  });

  it('mở biểu mẫu sửa với dữ liệu hiện tại và gửi nội dung đã cập nhật', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Sửa cam kết' }));

    expect(screen.getByRole('dialog', { name: 'Sửa cam kết' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Tiêu đề/)).toHaveValue(
      'Bàn giao bản beta',
    );
    expect(screen.getByLabelText('Mô tả')).toHaveValue(
      'Hoàn thiện và bàn giao bản beta cho khách hàng.',
    );

    const titleInput = screen.getByLabelText(/^Tiêu đề/);
    await user.clear(titleInput);
    await user.type(titleInput, 'Bàn giao bản chính thức');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(useUpdateCommitment).toHaveBeenCalledWith(
      'project-1',
      'commitment-1',
    );
    expect(updateCommitment).toHaveBeenCalledWith(
      {
        title: 'Bàn giao bản chính thức',
        description: 'Hoàn thiện và bàn giao bản beta cho khách hàng.',
        ownerId: 'user-1',
        requestedByContactId: 'contact-1',
        dueAt: '2026-09-25T08:00:00.000Z',
        promisedAt: '2026-09-18T08:00:00.000Z',
        scopeStatus: 'IN_SCOPE',
        scopeItemId: null,
        version: 2,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('thêm bằng chứng đường dẫn cho cam kết', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(
      screen.getByRole('dialog', { name: 'Thêm bằng chứng' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('URL'), 'https://example.com/demo');
    await user.click(screen.getAllByRole('button', { name: 'Thêm' }).at(-1)!);

    expect(useAddEvidence).toHaveBeenCalledWith('commitment-1');
    expect(addEvidence).toHaveBeenCalledWith(
      {
        milestone: 'IMPLEMENTED',
        type: 'URL',
        url: 'https://example.com/demo',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('gỡ nguồn tham chiếu khỏi cam kết', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentDetailModal projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Gỡ nguồn tham chiếu' }),
    );

    expect(useRemoveSourceRef).toHaveBeenCalledWith('commitment-1');
    expect(removeSourceRef).toHaveBeenCalledWith('ref-1');
  });
});
