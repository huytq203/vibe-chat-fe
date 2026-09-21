import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMembers } from '@/features/tasks/hooks/useMembers';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';
import { ConfirmCreateCommitmentForm } from './ConfirmCreateCommitmentForm';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: { create: vi.fn() },
}));
vi.mock('@/features/tasks/hooks/useMembers', () => ({ useMembers: vi.fn() }));

const ACTION = {
  type: 'CREATE_COMMITMENT' as const,
  title: 'Cam kết X',
  description: 'Mô tả X',
  targetCommitmentId: null,
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
      <ConfirmCreateCommitmentForm
        projectId="proj-1"
        action={ACTION}
        scopeStatus="UNCLEAR"
        source={SOURCE}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMembers).mockReturnValue({ data: [] } as never);
});

describe('ConfirmCreateCommitmentForm', () => {
  it('nên điền sẵn tiêu đề và mô tả từ đề xuất', () => {
    renderForm();

    expect(screen.getByDisplayValue('Cam kết X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mô tả X')).toBeInTheDocument();
  });

  it('nên tạo cam kết kèm nguồn rồi báo hoàn tất', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({
      id: 'commitment-1',
      title: 'Cam kết X',
      deliveryStatus: 'PLANNED',
      scopeStatus: 'UNCLEAR',
      ownerId: null,
      dueAt: null,
      deliveredAt: null,
      version: 1,
      createdAt: '2026-09-21T00:00:00.000Z',
      updatedAt: '2026-09-21T00:00:00.000Z',
      contact: null,
      risks: [],
      isReadyToDeliver: false,
    });
    const onDone = vi.fn();
    renderForm(onDone);

    fireEvent.click(screen.getByRole('button', { name: /xác nhận tạo cam kết/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        title: 'Cam kết X',
        description: 'Mô tả X',
        scopeStatus: 'UNCLEAR',
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

  it('nên vô hiệu hóa nút xác nhận khi tiêu đề rỗng', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/tiêu đề cam kết/i), {
      target: { value: '' },
    });

    expect(screen.getByRole('button', { name: /xác nhận tạo cam kết/i })).toBeDisabled();
  });
});
