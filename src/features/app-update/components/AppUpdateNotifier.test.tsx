import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showElectronNotification } from '@/lib/electron';
import type { AppUpdateState } from '../lib/resolve-update';
import { AppUpdateNotifier } from './AppUpdateNotifier';

const { manifestState } = vi.hoisted(() => ({
  manifestState: { current: { kind: 'none' } as AppUpdateState },
}));

vi.mock('../hooks/use-update-manifest', () => ({
  useUpdateManifest: () => ({ state: manifestState.current }),
}));
vi.mock('@/lib/electron', () => ({ showElectronNotification: vi.fn() }));
vi.mock('@/lib/pwa/reload-with-latest-worker', () => ({ reloadWithLatestWorker: vi.fn() }));

const DESKTOP_UPDATE: AppUpdateState = {
  kind: 'desktop-available',
  version: '0.3.0',
  downloadUrl: 'https://s3.example.com/Halo-Setup-0.3.0.exe',
  releaseNotes: null,
};

describe('AppUpdateNotifier', () => {
  beforeEach(() => {
    manifestState.current = { kind: 'none' };
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('nên không hiện gì khi không có bản mới', () => {
    const { container } = render(<AppUpdateNotifier />);

    expect(container).toBeEmptyDOMElement();
  });

  it('nên nhớ "Để sau" theo version và không nhắc lại bản đó', async () => {
    const user = userEvent.setup();
    manifestState.current = { kind: 'web-available', version: '0.3.0' };
    const { unmount } = render(<AppUpdateNotifier />);

    await user.click(screen.getByRole('button', { name: 'Để sau' }));
    expect(screen.queryByText(/0\.3\.0/)).not.toBeInTheDocument();

    unmount();
    render(<AppUpdateNotifier />);
    expect(screen.queryByText(/0\.3\.0/)).not.toBeInTheDocument();
  });

  it('nên vẫn báo bản kế tiếp dù đã bỏ qua bản trước', () => {
    localStorage.setItem('halo.update.dismissed-version', '0.3.0');
    manifestState.current = { kind: 'web-available', version: '0.3.1' };

    render(<AppUpdateNotifier />);

    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
  });

  it('nên mở link tải và gửi thông báo OS đúng 1 lần cho bản desktop mới', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    manifestState.current = DESKTOP_UPDATE;

    const { unmount } = render(<AppUpdateNotifier />);
    await user.click(screen.getByRole('button', { name: 'Tải về' }));
    unmount();
    render(<AppUpdateNotifier />);

    expect(open).toHaveBeenCalledWith(DESKTOP_UPDATE.downloadUrl, '_blank', 'noopener,noreferrer');
    expect(showElectronNotification).toHaveBeenCalledTimes(1);
  });

  it('nên chặn bằng màn hình bắt buộc cập nhật và không cho bỏ qua', () => {
    manifestState.current = { ...DESKTOP_UPDATE, kind: 'desktop-required' };

    render(<AppUpdateNotifier />);

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Cần cập nhật Halo');
    expect(screen.queryByRole('button', { name: 'Để sau' })).not.toBeInTheDocument();
  });
});
