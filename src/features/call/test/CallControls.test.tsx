import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallControls } from '../components/CallControls';

describe('CallControls', () => {
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
});
