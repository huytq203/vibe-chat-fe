import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageAnalysis } from '@/features/chat/types';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';
import { ConfirmLinkExistingCommitmentForm } from './ConfirmLinkExistingCommitmentForm';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: { linkSourceRef: vi.fn(), list: vi.fn() },
}));

const SOURCE = {
  conversationId: '11111111-1111-4111-8111-111111111111',
  messageIds: ['22222222-2222-4222-8222-222222222222'],
};
const ACTION = {
  type: 'LINK_EXISTING_COMMITMENT' as const,
  title: 'Gắn cam kết',
  description: 'Gắn tin nhắn vào cam kết có sẵn',
  targetCommitmentId: 'commitment-1',
};
const ACTION_WITHOUT_TARGET = { ...ACTION, targetCommitmentId: null };

function renderForm(
  action: MessageAnalysis['suggestedActions'][number] = ACTION,
  onDone = vi.fn(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmLinkExistingCommitmentForm
        projectId="proj-1"
        action={action}
        source={SOURCE}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(commitmentsApi.list).mockResolvedValue({
    data: [
      {
        id: 'commitment-1',
        title: 'Cam kết hiện có',
        deliveryStatus: 'PLANNED',
      },
    ],
    meta: { total: 1 },
  });
});

describe('ConfirmLinkExistingCommitmentForm', () => {
  it('nên điền sẵn cam kết mục tiêu từ đề xuất', () => {
    renderForm();

    expect(screen.getByRole('combobox')).toHaveValue('commitment-1');
    expect(
      screen.getByRole('button', { name: /xác nhận gắn vào cam kết/i }),
    ).toBeEnabled();
  });

  it('nên gắn nguồn vào cam kết được chọn rồi báo hoàn tất', async () => {
    vi.mocked(commitmentsApi.linkSourceRef).mockResolvedValue(undefined);
    const onDone = vi.fn();
    renderForm(ACTION, onDone);

    await userEvent.click(
      screen.getByRole('button', { name: /xác nhận gắn vào cam kết/i }),
    );

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(commitmentsApi.linkSourceRef).toHaveBeenCalledWith('commitment-1', {
      type: 'CHAT_MESSAGE',
      conversationId: SOURCE.conversationId,
      messageIds: SOURCE.messageIds,
    });
  });

  it('nên vô hiệu hóa nút xác nhận khi chưa chọn cam kết', () => {
    renderForm(ACTION_WITHOUT_TARGET);

    expect(
      screen.getByRole('button', { name: /xác nhận gắn vào cam kết/i }),
    ).toBeDisabled();
  });
});
