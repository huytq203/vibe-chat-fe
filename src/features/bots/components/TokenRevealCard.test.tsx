import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenRevealCard } from './TokenRevealCard';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('TokenRevealCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hiện đúng token plaintext', () => {
    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);
    expect(screen.getByText('bot-1:secret')).toBeInTheDocument();
  });

  it('nút Đóng bị disable khi chưa tick checkbox xác nhận', () => {
    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: /đóng/i })).toBeDisabled();
  });

  it('nút Đóng enable sau khi tick checkbox, và gọi onDone khi click', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<TokenRevealCard token="bot-1:secret" onDone={onDone} />);

    await user.click(screen.getByRole('checkbox'));
    const closeBtn = screen.getByRole('button', { name: /đóng/i });
    expect(closeBtn).toBeEnabled();

    await user.click(closeBtn);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('click Copy gọi clipboard.writeText với đúng token', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);

    const copyBtn = screen.getByLabelText('Copy token');
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith('bot-1:secret');
  });
});
