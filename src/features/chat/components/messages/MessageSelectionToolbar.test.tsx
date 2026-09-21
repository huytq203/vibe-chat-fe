import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MessageSelectionToolbar } from './MessageSelectionToolbar';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

beforeEach(() => {
  useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() });
});

describe('MessageSelectionToolbar', () => {
  it('renders nothing when selection is inactive for this conversation', () => {
    const { container } = render(
      <MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected message count', () => {
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2', 'm3']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />);
    expect(screen.getByText('Đã chọn 3 tin nhắn')).toBeInTheDocument();
  });

  it('analyzes the selected ids and exits selection mode', async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole('button', { name: 'Phân tích đã chọn' }));

    expect(onAnalyze).toHaveBeenCalledWith(expect.arrayContaining(['m1', 'm2']));
    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });

  it('exits selection mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });
});
