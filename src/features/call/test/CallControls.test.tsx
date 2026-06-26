import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallControls } from '../components/CallControls';
import { useCallStore } from '../stores/call.store';

const peer = { id: 'u2', name: 'Bob', avatarUrl: null };

describe('CallControls', () => {
  afterEach(() => useCallStore.getState().reset());
  it('calls onToggleMic when mic button clicked', async () => {
    const onToggleMic = vi.fn();
    render(
      <CallControls
        micOn
        camOn
        onToggleMic={onToggleMic}
        onToggleCam={vi.fn()}
        onHangup={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText('Tắt micro'));
    expect(onToggleMic).toHaveBeenCalledOnce();
  });

  it('calls onHangup when hangup clicked', async () => {
    const onHangup = vi.fn();
    render(
      <CallControls
        micOn
        camOn={false}
        onToggleMic={vi.fn()}
        onToggleCam={vi.fn()}
        onHangup={onHangup}
      />,
    );
    await userEvent.click(screen.getByLabelText('Kết thúc'));
    expect(onHangup).toHaveBeenCalledOnce();
  });

  it('always shows camera button (cho phép nâng audio → video)', async () => {
    const onToggleCam = vi.fn();
    render(
      <CallControls
        micOn
        camOn={false}
        onToggleMic={vi.fn()}
        onToggleCam={onToggleCam}
        onHangup={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText('Bật camera'));
    expect(onToggleCam).toHaveBeenCalledOnce();
  });

  it('AUDIO 1-1 đang gọi: hiện nút "Chuyển sang video" gọi onRequestUpgrade thay vì bật cam', async () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer, false, {});
    useCallStore.getState().markOngoing('call-1', Date.now());
    const onRequestUpgrade = vi.fn();
    render(
      <CallControls
        micOn
        camOn={false}
        onToggleMic={vi.fn()}
        onToggleCam={vi.fn()}
        onHangup={vi.fn()}
        onRequestUpgrade={onRequestUpgrade}
      />,
    );
    await userEvent.click(screen.getByLabelText('Chuyển sang video'));
    expect(onRequestUpgrade).toHaveBeenCalledOnce();
  });
});
