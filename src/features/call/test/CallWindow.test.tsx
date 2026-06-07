import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallWindow } from '../components/CallWindow';
import type { CallPeer } from '@/features/call/types';

const peer: CallPeer = { id: 'u2', name: 'Bob', avatarUrl: null };
const baseProps = {
  type: 'AUDIO' as const,
  peer,
  phase: 'ongoing' as const,
  mode: 'normal' as const,
  micOn: true,
  camOn: false,
  position: { x: 0, y: 0 },
  statusText: '0:05',
  setRemoteEl: vi.fn(),
  setLocalEl: vi.fn(),
  onToggleMic: vi.fn(),
  onToggleCam: vi.fn(),
  onHangup: vi.fn(),
  onSetMode: vi.fn(),
  onClose: vi.fn(),
  onDrag: vi.fn(),
};

describe('CallWindow', () => {
  it('renders peer name in normal mode', () => {
    render(<CallWindow {...baseProps} />);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('renders hangup control', () => {
    render(<CallWindow {...baseProps} />);
    expect(screen.getByLabelText('Kết thúc')).toBeInTheDocument();
  });

  it('normal mode shows minimize + fullscreen controls and triggers onSetMode', async () => {
    const onSetMode = vi.fn();
    render(<CallWindow {...baseProps} onSetMode={onSetMode} />);
    await userEvent.click(screen.getByLabelText('Thu nhỏ'));
    expect(onSetMode).toHaveBeenCalledWith('mini');
    await userEvent.click(screen.getByLabelText('Toàn màn hình'));
    expect(onSetMode).toHaveBeenCalledWith('fullscreen');
  });

  it('mini mode still exposes restore (Cửa sổ vừa) — not a hangup-only pill', async () => {
    const onSetMode = vi.fn();
    render(<CallWindow {...baseProps} mode="mini" onSetMode={onSetMode} />);
    await userEvent.click(screen.getByLabelText('Cửa sổ vừa'));
    expect(onSetMode).toHaveBeenCalledWith('normal');
  });

  it('close (Thu gọn) triggers onClose without ending the call', async () => {
    const onClose = vi.fn();
    const onHangup = vi.fn();
    render(<CallWindow {...baseProps} onClose={onClose} onHangup={onHangup} />);
    await userEvent.click(screen.getByLabelText('Thu gọn'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onHangup).not.toHaveBeenCalled();
  });
});
