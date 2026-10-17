import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DownloadDesktopApp } from './DownloadDesktopApp';

const url = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('../hooks/use-desktop-download-url', () => ({ useDesktopDownloadUrl: () => url.value }));

describe('DownloadDesktopApp', () => {
  beforeEach(() => {
    url.value = null;
  });

  it('nên không hiện gì khi chưa có link tải cho hệ điều hành này', () => {
    const { container } = render(<DownloadDesktopApp />);

    expect(container).toBeEmptyDOMElement();
  });

  it('nên hiện link tải mở ở tab mới và chỉ từ màn lớn', () => {
    url.value = 'https://dl.example.com/Halo-Setup-0.3.0.exe';
    render(<DownloadDesktopApp />);

    const link = screen.getByRole('link', { name: /Tải ứng dụng cho máy tính/ });
    expect(link).toHaveAttribute('href', url.value);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveClass('hidden', 'lg:inline-flex');
  });
});
