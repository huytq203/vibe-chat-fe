'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BANNER_DELAY_MS,
  MIN_VISITS_BEFORE_BANNER,
  bumpVisitCount,
  isInstallDismissed,
  markInstallDismissed,
} from './install-eligibility';
import { type InstallMode, useInstallCapability } from './useInstallCapability';

interface InstallBanner {
  mode: InstallMode;
  install: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Banner mời cài chỉ bung khi user đã quay lại app và ở lại đủ lâu. Đóng một lần
 * là thôi hẳn — lối vào thủ công nằm ở menu tài khoản (`InstallAppMenuItem`).
 */
export function useInstallBanner(enabled: boolean): InstallBanner {
  const { mode, install } = useInstallCapability(enabled);
  const [isDue, setDue] = useState(false);
  const [isDismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled || isInstallDismissed()) return;
    if (bumpVisitCount() < MIN_VISITS_BEFORE_BANNER) return;

    const timer = setTimeout(() => setDue(true), BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled]);

  const dismiss = useCallback((): void => {
    markInstallDismissed();
    setDismissed(true);
  }, []);

  return { mode: isDue && !isDismissed ? mode : null, install, dismiss };
}
