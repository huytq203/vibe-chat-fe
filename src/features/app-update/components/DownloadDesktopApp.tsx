'use client';

import { Download } from 'lucide-react';
import { useDesktopDownloadUrl } from '../hooks/use-desktop-download-url';

/** Nút "Tải ứng dụng cho máy tính" ở màn đăng nhập web. Ẩn trên điện thoại và trong app desktop. */
export function DownloadDesktopApp() {
  const url = useDesktopDownloadUrl();
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden h-11 items-center gap-2.5 rounded-xl border border-border bg-muted px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary lg:inline-flex"
    >
      <Download className="size-[18px]" aria-hidden="true" />
      Tải ứng dụng cho máy tính
    </a>
  );
}
