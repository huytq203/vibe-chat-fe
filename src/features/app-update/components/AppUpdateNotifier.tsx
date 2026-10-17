'use client';

import { useState, type ReactNode } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { NoticeCard } from '@/lib/pwa/NoticeCard';
import { reloadWithLatestWorker } from '@/lib/pwa/reload-with-latest-worker';
import { useAppUpdate } from '../hooks/use-app-update';
import { openDownloadPage } from '../lib/open-download';
import { ForceUpdateScreen } from './ForceUpdateScreen';

function WebReloadButton() {
  const [isReloading, setIsReloading] = useState(false);
  const handleClick = (): void => {
    setIsReloading(true);
    void reloadWithLatestWorker();
  };
  return (
    <Button size="sm" onClick={handleClick} isLoading={isReloading}>
      Tải lại
    </Button>
  );
}

/**
 * Báo bản cập nhật cho cả web lẫn desktop. Chỉ hiện khi semver tăng; "Để sau" được
 * nhớ theo từng version nên không nhắc lại cho tới bản kế tiếp.
 */
export function AppUpdateNotifier(): ReactNode {
  const { state, isVisible, dismiss } = useAppUpdate();
  if (!isVisible || state.kind === 'none') return null;

  if (state.kind === 'desktop-required') {
    return (
      <ForceUpdateScreen
        version={state.version}
        downloadUrl={state.downloadUrl}
        releaseNotes={state.releaseNotes}
      />
    );
  }

  const downloadUrl = state.kind === 'desktop-available' ? state.downloadUrl : null;
  const action = downloadUrl ? (
    <Button size="sm" onClick={() => openDownloadPage(downloadUrl)}>
      <Download className="size-4" aria-hidden="true" />
      Tải về
    </Button>
  ) : (
    <WebReloadButton />
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top,0px)+0.75rem)] z-[100] flex justify-center px-3"
      aria-live="polite"
    >
      <NoticeCard
        icon={<RefreshCw className="size-5 shrink-0 text-primary" aria-hidden="true" />}
        action={action}
        onDismiss={dismiss}
        dismissLabel="Để sau"
      >
        Halo đã có phiên bản <strong>{state.version}</strong>.
      </NoticeCard>
    </div>
  );
}
