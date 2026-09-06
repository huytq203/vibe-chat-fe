import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isElectron } from '@/lib/electron';
import { InstallAppMenuItem } from './InstallAppMenuItem';

vi.mock('@/lib/electron', () => ({ isElectron: vi.fn(() => false) }));

const DESKTOP_UA = navigator.userAgent;
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function setUserAgent(value: string): void {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value });
}

function firePromptEvent(prompt = vi.fn().mockResolvedValue(undefined)): typeof prompt {
  fireEvent(
    window,
    Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }),
  );
  return prompt;
}

describe('InstallAppMenuItem', () => {
  afterEach(() => {
    // Store giữ sự kiện ở module scope — `appinstalled` là cách dọn đúng ngữ nghĩa.
    fireEvent(window, new Event('appinstalled'));
    setUserAgent(DESKTOP_UA);
    localStorage.clear();
    vi.mocked(isElectron).mockReturnValue(false);
  });

  it('không hiện gì khi browser chưa cho cài', () => {
    const { container } = render(<InstallAppMenuItem />);

    expect(container).toBeEmptyDOMElement();
  });

  it('hiện lối vào thủ công ngay cả khi banner đã bị đóng vĩnh viễn', async () => {
    localStorage.setItem('halo.pwa.install-dismissed', '1');
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<InstallAppMenuItem onSelect={onSelect} />);
    const prompt = firePromptEvent();
    await user.click(await screen.findByRole('button', { name: 'Cài ứng dụng' }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('mở hướng dẫn thủ công trên iOS vì không có beforeinstallprompt', async () => {
    setUserAgent(IPHONE_UA);
    const user = userEvent.setup();

    render(<InstallAppMenuItem />);
    expect(screen.queryByText(/Thêm vào MH chính/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cài ứng dụng' }));

    expect(screen.getByText(/Thêm vào MH chính/)).toBeInTheDocument();
  });

  it('không hiện trong Electron vì đã là app desktop', () => {
    vi.mocked(isElectron).mockReturnValue(true);

    const { container } = render(<InstallAppMenuItem />);
    firePromptEvent();

    expect(container).toBeEmptyDOMElement();
  });
});
