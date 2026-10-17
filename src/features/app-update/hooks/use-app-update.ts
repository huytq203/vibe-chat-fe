'use client';

import { useCallback, useEffect, useState } from 'react';
import { showElectronNotification } from '@/lib/electron';
import { getItem, setItem } from '@/lib/storage/local-storage';
import type { AppUpdateState } from '../lib/resolve-update';
import { useUpdateManifest } from './use-update-manifest';

// Ghi nhớ THEO VERSION: "Để sau" chỉ ẩn bản đó; bản tiếp theo vẫn được báo.
const DISMISSED_KEY = 'halo.update.dismissed-version';
const NOTIFIED_KEY = 'halo.update.notified-version';

type AppUpdate = {
  state: AppUpdateState;
  isVisible: boolean;
  dismiss: () => void;
};

/** Thông báo native của OS đúng 1 lần cho mỗi bản desktop mới. */
function useNativeUpdateNotification(state: AppUpdateState): void {
  const version = state.kind === 'none' ? null : state.version;
  const isDesktop = state.kind === 'desktop-available' || state.kind === 'desktop-required';

  useEffect(() => {
    if (!isDesktop || !version || getItem(NOTIFIED_KEY) === version) return;
    setItem(NOTIFIED_KEY, version);
    showElectronNotification({
      title: 'Halo có bản cập nhật',
      body: `Phiên bản ${version} đã sẵn sàng để tải về.`,
    });
  }, [isDesktop, version]);
}

export function useAppUpdate(): AppUpdate {
  const { state } = useUpdateManifest();
  const [dismissedVersion, setDismissedVersion] = useState(() => getItem(DISMISSED_KEY));
  useNativeUpdateNotification(state);

  const dismiss = useCallback((): void => {
    if (state.kind === 'none' || state.kind === 'desktop-required') return;
    setItem(DISMISSED_KEY, state.version);
    setDismissedVersion(state.version);
  }, [state]);

  const isVisible =
    state.kind === 'desktop-required' ||
    (state.kind !== 'none' && state.version !== dismissedVersion);

  return { state, isVisible, dismiss };
}
