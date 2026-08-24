import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallWindow } from '../components/CallWindow';
import { useCallStore } from '../stores/call.store';
import type { CallPeer } from '@/features/call/types';

const peer: CallPeer = { id: 'u2', name: 'Bob', avatarUrl: null };
const baseProps = {
  type: 'AUDIO' as const,
  peer,
  isGroup: false,
  directory: {},
  remoteIds: [] as string[],
  participantCount: 2,
  phase: 'ongoing' as const,
  mode: 'normal' as const,
  micOn: true,
  camOn: false,
  position: { x: 0, y: 0 },
  statusText: '0:05',
  getRemoteRef: () => vi.fn(),
  setLocalEl: vi.fn(),
  onToggleMic: vi.fn(),
  onToggleCam: vi.fn(),
  onHangup: vi.fn(),
  onRequestUpgrade: vi.fn(),
  onAcceptUpgrade: vi.fn(),
  onDeclineUpgrade: vi.fn(),
  onSetMode: vi.fn(),
  onClose: vi.fn(),
  onDrag: vi.fn(),
};

const desktopMatchMedia = window.matchMedia;

function mockMobileViewport() {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

describe('CallWindow trên mobile', () => {
  beforeEach(mockMobileViewport);
  afterEach(() => {
    window.matchMedia = desktopMatchMedia;
    useCallStore.getState().reset();
  });

  it('mode "normal" của desktop hiển thị như toàn màn hình', () => {
    render(<CallWindow {...baseProps} />);
    expect(screen.getByLabelText('Thu nhỏ')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cửa sổ vừa')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Thu gọn')).not.toBeInTheDocument();
  });

  it('toàn màn hình chỉ có một lối thoát: thu về mini', async () => {
    const onSetMode = vi.fn();
    render(<CallWindow {...baseProps} onSetMode={onSetMode} />);
    await userEvent.click(screen.getByLabelText('Thu nhỏ'));
    expect(onSetMode).toHaveBeenCalledWith('mini');
  });

  it('mini là pill: chạm để mở lại toàn màn hình, vẫn có nút kết thúc', async () => {
    const onSetMode = vi.fn();
    const onHangup = vi.fn();
    render(<CallWindow {...baseProps} mode="mini" onSetMode={onSetMode} onHangup={onHangup} />);

    await userEvent.click(screen.getByLabelText('Mở lại cuộc gọi'));
    expect(onSetMode).toHaveBeenCalledWith('fullscreen');

    await userEvent.click(screen.getByLabelText('Kết thúc'));
    expect(onHangup).toHaveBeenCalledOnce();
  });

  it('cuộc gọi mới trên mobile mặc định toàn màn hình', () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer, false, {});
    expect(useCallStore.getState().window.mode).toBe('fullscreen');
  });
});
