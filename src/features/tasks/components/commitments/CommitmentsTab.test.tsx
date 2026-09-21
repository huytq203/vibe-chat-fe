import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import {
  useCommitmentsInfinite,
  useCreateCommitment,
  useCommitmentDetail,
} from '../../hooks/useCommitments';
import { useMembers } from '../../hooks/useMembers';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { CommitmentSummary } from '../../types';
import { CommitmentsTab } from './CommitmentsTab';

vi.mock('../../hooks/useCommitments', () => ({
  useCommitmentsInfinite: vi.fn(),
  useCreateCommitment: vi.fn(),
  useCommitmentDetail: vi.fn(),
}));

vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(),
}));

vi.mock('../../stores/tasks-ui.store', () => ({
  useTasksUIStore: vi.fn(),
}));

const createCommitment = vi.fn();
const openCommitmentDetail = vi.fn();

const commitment: CommitmentSummary = {
  id: 'commitment-1',
  title: 'Bàn giao bản beta',
  deliveryStatus: 'IN_PROGRESS',
  scopeStatus: 'IN_SCOPE',
  ownerId: 'user-1',
  dueAt: '2099-10-15T00:00:00.000Z',
  deliveredAt: null,
  version: 3,
  createdAt: '2026-09-20T08:00:00.000Z',
  updatedAt: '2026-09-20T09:00:00.000Z',
  contact: {
    id: 'contact-1',
    userId: null,
    name: 'Minh Anh',
    email: 'minh.anh@example.com',
    title: 'Product Owner',
    isPrimary: true,
    isDeleted: false,
  },
  risks: ['NO_TASK', 'WAITING_CLIENT', 'NO_OWNER'],
  isReadyToDeliver: false,
};

function commitmentsResult(items: CommitmentSummary[]) {
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
            hasPrevious: false,
          },
        },
      ],
      pageParams: [1],
    },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as ReturnType<typeof useCommitmentsInfinite>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCommitmentsInfinite).mockReturnValue(
    commitmentsResult([commitment]),
  );
  vi.mocked(useCreateCommitment).mockReturnValue({
    mutate: createCommitment,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateCommitment>);
  vi.mocked(useCommitmentDetail).mockReturnValue({
    isPending: false,
    data: undefined,
  } as ReturnType<typeof useCommitmentDetail>);
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
  vi.mocked(useTasksUIStore).mockImplementation((selector) =>
    selector({ openCommitmentDetail, selectedCommitmentId: null } as never),
  );
});

describe('CommitmentsTab', () => {
  it('renders the commitment list and status badges', () => {
    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    expect(screen.getByText('Bàn giao bản beta')).toBeInTheDocument();
    expect(screen.getByText('Đang thực hiện')).toBeInTheDocument();
    expect(screen.getByText('Chưa có task')).toBeInTheDocument();
    expect(screen.getByText('Chờ khách phản hồi')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
  });

  it('applies the selected delivery status filter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(
      await screen.findByRole('option', { name: 'Đang thực hiện' }),
    );

    await waitFor(() =>
      expect(useCommitmentsInfinite).toHaveBeenLastCalledWith('project-1', {
        deliveryStatus: 'IN_PROGRESS',
      }),
    );
  });

  it('renders the empty-state call to action', () => {
    vi.mocked(useCommitmentsInfinite).mockReturnValue(commitmentsResult([]));

    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    expect(screen.getByText('Chưa có cam kết nào.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tạo cam kết đầu tiên' }),
    ).toBeInTheDocument();
  });

  it('creates a commitment with the entered values', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Tạo cam kết' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      '  Ra mắt MVP  ',
    );
    await user.type(
      within(dialog).getByLabelText('Mô tả (không bắt buộc)'),
      '  Bàn giao cho khách hàng  ',
    );
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Nguyễn An' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tạo' }));

    expect(createCommitment).toHaveBeenCalledWith(
      {
        title: 'Ra mắt MVP',
        description: 'Bàn giao cho khách hàng',
        ownerId: 'user-1',
        scopeStatus: 'UNCLEAR',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('resets the form after cancelling creation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    await user.click(screen.getByRole('button', { name: 'Tạo cam kết' }));
    let dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Tiêu đề/), 'Bản nháp');
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    await user.click(screen.getByRole('button', { name: 'Tạo cam kết' }));
    dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText(/^Tiêu đề/)).toHaveValue('');
  });

  it('opens the selected commitment detail', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentsTab projectId="project-1" />);

    await user.click(
      screen.getByRole('button', { name: /Bàn giao bản beta/ }),
    );

    expect(openCommitmentDetail).toHaveBeenCalledWith('commitment-1');
  });
});
