'use client';

import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { openDownloadPage, useUpdateManifest, type AppUpdateState } from '@/features/app-update';
import { isElectron } from '@/lib/electron';
import { APP_VERSION, BUILD_ID } from '@/lib/version/app-version';
import { SettingsSection } from './SettingsSection';

function announce(state: AppUpdateState): void {
  if (state.kind === 'none') {
    toast.success('Bạn đang dùng phiên bản mới nhất');
    return;
  }
  if (state.kind === 'web-available') {
    toast.info(`Đã có phiên bản ${state.version}, tải lại trang để cập nhật`);
    return;
  }
  const { downloadUrl } = state;
  toast.info(`Đã có phiên bản ${state.version}`, {
    action: downloadUrl ? { label: 'Tải về', onClick: () => openDownloadPage(downloadUrl) } : undefined,
  });
}

/** Hiển thị phiên bản đang chạy + kiểm tra cập nhật thủ công. */
export function AppVersionSection() {
  const { isEnabled, isChecking, check } = useUpdateManifest();
  const platformLabel = isElectron() ? 'Desktop' : 'Web';

  const handleCheck = async (): Promise<void> => {
    try {
      announce(await check());
    } catch {
      toast.error('Không kiểm tra được bản cập nhật, thử lại sau');
    }
  };

  return (
    <SettingsSection title="Phiên bản" desc="Thông tin bản Halo đang chạy trên thiết bị này.">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">
            Halo {platformLabel} v{APP_VERSION}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">Build {BUILD_ID}</p>
        </div>
        {isEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCheck()}
            isLoading={isChecking}
            className="shrink-0 max-sm:h-11"
          >
            <RefreshCw className="h-4 w-4" />
            Kiểm tra cập nhật
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
