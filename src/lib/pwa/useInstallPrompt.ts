'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getItem, setItem } from '@/lib/storage/local-storage';
import { isStandaloneApp } from './display-mode';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** `prompt`: browser tự mở hộp thoại cài. `ios`: Safari iOS không có API, phải hướng dẫn tay. */
export type InstallMode = 'prompt' | 'ios' | null;

type InstallPrompt = {
  mode: InstallMode;
  install: () => Promise<void>;
  dismissInstall: () => void;
};

const IOS_HINT_DISMISSED_KEY = 'halo.pwa.ios-hint-dismissed';

/** iOS/iPadOS: `beforeinstallprompt` không tồn tại nên phải tự chỉ chỗ nút Chia sẻ. */
function isIosBrowser(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Chỉ đọc một lần lúc mount, không có sự kiện nào để theo dõi. */
const subscribeNothing = (): (() => void) => () => undefined;

export function useInstallPrompt(enabled: boolean): InstallPrompt {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosHintDismissed, setIosHintDismissed] = useState(false);

  const getIosSnapshot = useCallback(
    () =>
      enabled &&
      !isStandaloneApp() &&
      isIosBrowser() &&
      getItem(IOS_HINT_DISMISSED_KEY) === null,
    [enabled],
  );
  const isIosHintEligible = useSyncExternalStore(subscribeNothing, getIosSnapshot, () => false);

  useEffect(() => {
    // Đã cài rồi thì không mời cài nữa.
    if (!enabled || isStandaloneApp()) return;

    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setPromptEvent(null);
      setIosHintDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [enabled]);

  const install = useCallback(async (): Promise<void> => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }, [promptEvent]);

  const dismissInstall = useCallback((): void => {
    setPromptEvent(null);
    // Hướng dẫn iOS hiện lại mỗi lần mở app sẽ thành phiền → nhớ lựa chọn của user.
    if (isIosHintEligible) setItem(IOS_HINT_DISMISSED_KEY, '1');
    setIosHintDismissed(true);
  }, [isIosHintEligible]);

  const hasIosHint = isIosHintEligible && !isIosHintDismissed;
  const mode: InstallMode = promptEvent ? 'prompt' : hasIosHint ? 'ios' : null;

  return { mode, install, dismissInstall };
}
