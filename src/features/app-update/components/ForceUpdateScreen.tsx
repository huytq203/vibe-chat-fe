'use client';

import { Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { APP_VERSION } from '@/lib/version/app-version';
import { openDownloadPage } from '../lib/open-download';

type ForceUpdateScreenProps = {
  version: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
};

/** Phủ toàn màn hình: bản desktop đã ngừng hỗ trợ, phải cài bản mới mới dùng tiếp. */
export function ForceUpdateScreen({ version, downloadUrl, releaseNotes }: ForceUpdateScreenProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-6"
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <ShieldAlert className="size-12 text-warning" aria-hidden="true" />
        <h1 id="force-update-title" className="text-lg font-semibold text-foreground">
          Cần cập nhật Halo
        </h1>
        <p className="text-sm text-muted-foreground">
          Phiên bản {APP_VERSION} đã ngừng hỗ trợ. Vui lòng cài bản {version} để tiếp tục sử dụng.
        </p>
        {releaseNotes && (
          <p className="whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-left text-[13px] text-foreground">
            {releaseNotes}
          </p>
        )}
        {downloadUrl ? (
          <Button onClick={() => openDownloadPage(downloadUrl)}>
            <Download className="size-4" aria-hidden="true" />
            Tải bản {version}
          </Button>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Chưa có bộ cài cho hệ điều hành này, vui lòng liên hệ quản trị viên.
          </p>
        )}
      </div>
    </div>
  );
}
