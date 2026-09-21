import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changeRequestsApi } from '@/features/tasks/services/commitments.api';
import { ConfirmCreateChangeRequestForm } from './ConfirmCreateChangeRequestForm';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  changeRequestsApi: { create: vi.fn() },
}));

const ACTION = {
  type: 'CREATE_CHANGE_REQUEST' as const,
  title: 'Yêu cầu thay đổi X',
  description: 'Tác động X',
  targetCommitmentId: 'commitment-1',
};
const SOURCE = {
  conversationId: '11111111-1111-4111-8111-111111111111',
  messageIds: ['22222222-2222-4222-8222-222222222222'],
};

function renderForm(onDone = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmCreateChangeRequestForm
        projectId="proj-1"
        action={ACTION}
        source={SOURCE}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConfirmCreateChangeRequestForm', () => {
  it('nên điền sẵn tiêu đề và tác động từ đề xuất', () => {
    renderForm();

    expect(screen.getByDisplayValue('Yêu cầu thay đổi X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tác động X')).toBeInTheDocument();
  });

  it('nên tạo yêu cầu thay đổi gắn với cam kết rồi báo hoàn tất', async () => {
    vi.mocked(changeRequestsApi.create).mockResolvedValue({
      id: 'change-request-1',
      projectId: 'proj-1',
      commitmentId: 'commitment-1',
      title: 'Yêu cầu thay đổi X',
      impact: 'Tác động X',
      estimateHours: null,
      cost: null,
      currency: 'VND',
      timelineShiftDays: null,
      status: 'DRAFT',
      internalApprovedByUserId: null,
      internalApprovedAt: null,
      sentAt: null,
      clientApprovedByUserId: null,
      clientApprovedOnBehalfOf: null,
      clientApprovedAt: null,
      rejectedAt: null,
      rejectReason: null,
      createdBy: 'user-1',
      version: 1,
      createdAt: '2026-09-21T00:00:00.000Z',
      updatedAt: '2026-09-21T00:00:00.000Z',
      sourceRefs: [],
    });
    const onDone = vi.fn();
    renderForm(onDone);

    fireEvent.click(
      screen.getByRole('button', { name: /xác nhận tạo yêu cầu thay đổi/i }),
    );

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(changeRequestsApi.create).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        title: 'Yêu cầu thay đổi X',
        impact: 'Tác động X',
        commitmentId: 'commitment-1',
        sourceRefs: [
          {
            type: 'CHAT_MESSAGE',
            conversationId: SOURCE.conversationId,
            messageIds: SOURCE.messageIds,
          },
        ],
      }),
      expect.any(String),
    );
  });

  it('nên vô hiệu hóa nút xác nhận khi thiếu tiêu đề hoặc tác động', () => {
    renderForm();
    const button = screen.getByRole('button', {
      name: /xác nhận tạo yêu cầu thay đổi/i,
    });

    fireEvent.change(screen.getByLabelText(/tiêu đề yêu cầu thay đổi/i), {
      target: { value: '' },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/tiêu đề yêu cầu thay đổi/i), {
      target: { value: 'Tiêu đề mới' },
    });
    fireEvent.change(screen.getByLabelText(/tác động/i), { target: { value: '' } });
    expect(button).toBeDisabled();
  });
});
