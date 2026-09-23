import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { MessageSelectionToolbar } from './MessageSelectionToolbar';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';
import type { Message } from '@/features/chat/types';
import { toast } from 'sonner';
import { MessageInput } from './MessageInput';
import { renderWithProviders } from '@/test/test-utils';

const messages = [
  { id: 'm2', senderId: 'other', createdAt: '2026-09-23T09:30:00', plaintext: null, contentPreview: null, type: 'FILE' },
  { id: 'm1', senderId: 'me', createdAt: '2026-09-23T08:05:00', plaintext: 'Xin chào', contentPreview: 'Xin chào', type: 'TEXT' },
] as Message[];

const props = {
  conversationId: 'conv-1',
  onAnalyze: vi.fn(),
  messages,
  senderNames: { other: 'An' },
  meId: 'me',
};

beforeEach(() => {
  useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() });
});

describe('MessageSelectionToolbar', () => {
  it('renders nothing when selection is inactive for this conversation', () => {
    const { container } = render(
      <MessageSelectionToolbar {...props} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected message count', () => {
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2', 'm3']),
    });
    render(<MessageSelectionToolbar {...props} />);
    expect(screen.getByText('Đã chọn')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('analyzes the selected ids and exits selection mode', async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2']),
    });
    render(<MessageSelectionToolbar {...props} onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole('button', { name: 'Phân tích & xử lý' }));

    expect(onAnalyze).toHaveBeenCalledWith(expect.arrayContaining(['m1', 'm2']));
    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });

  it('exits selection mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1']),
    });
    render(<MessageSelectionToolbar {...props} />);

    await user.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });

  it('copies selected messages in chronological order with attachment fallback', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const success = vi.spyOn(toast, 'success');
    useMessageSelectionStore.setState({ conversationId: 'conv-1', selectedIds: new Set(['m2', 'm1']) });
    render(<MessageSelectionToolbar {...props} />);

    await user.click(screen.getByRole('button', { name: 'Sao chép' }));

    expect(writeText).toHaveBeenCalledWith('[08:05] Bạn: Xin chào\n[09:30] An: [Tệp đính kèm]');
    expect(success).toHaveBeenCalledWith('Đã sao chép 2 tin nhắn');
    success.mockRestore();
  });

  it('exits selection mode on Escape', async () => {
    const user = userEvent.setup();
    useMessageSelectionStore.setState({ conversationId: 'conv-1', selectedIds: new Set(['m1']) });
    render(<MessageSelectionToolbar {...props} />);
    await user.keyboard('{Escape}');
    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });

  it('disables analyze when no messages are selected', () => {
    useMessageSelectionStore.setState({ conversationId: 'conv-1', selectedIds: new Set() });
    render(<MessageSelectionToolbar {...props} />);
    expect(screen.getByRole('button', { name: 'Phân tích & xử lý' })).toBeDisabled();
  });

  it('disables the composer during selection and preserves its draft on exit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MessageInput conversationId="conv-1" conversationType="DIRECT" />);
    const editor = screen.getByPlaceholderText('Nhập tin nhắn...');
    await user.type(editor, 'Bản nháp');
    act(() => useMessageSelectionStore.getState().enter('conv-1', 'm1'));
    expect(editor).toBeDisabled();
    expect(editor).toHaveValue('Bản nháp');
    act(() => useMessageSelectionStore.getState().exit());
    expect(editor).toBeEnabled();
    expect(editor).toHaveValue('Bản nháp');
  });
});
