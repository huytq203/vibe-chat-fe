'use client';

import { useSyncExternalStore } from 'react';
import { isStandaloneApp } from './display-mode';
import { isIosBrowser } from './install-eligibility';
import {
  getInstallPrompt,
  getServerInstallPrompt,
  runInstallPrompt,
  subscribeInstallPrompt,
} from './install-store';

/** `prompt`: browser tự mở hộp thoại cài. `ios`: Safari iOS không có API, phải hướng dẫn tay. */
export type InstallMode = 'prompt' | 'ios' | null;

interface InstallCapability {
  mode: InstallMode;
  install: () => Promise<void>;
}

type InstallEnv = 'installed' | 'ios' | 'other';

function getInstallEnv(): InstallEnv {
  if (isStandaloneApp()) return 'installed';
  return isIosBrowser() ? 'ios' : 'other';
}

/** Môi trường không đổi trong vòng đời trang, nhưng phải đọc sau hydrate mới đúng. */
const subscribeNothing = (): (() => void) => () => undefined;
const getServerInstallEnv = (): InstallEnv => 'installed';

/**
 * App này có đang cài được không, và cài bằng cách nào. Không quan tâm tới việc
 * có nên mời hay chưa — phần đó thuộc về `useInstallBanner`.
 */
export function useInstallCapability(enabled: boolean): InstallCapability {
  const promptEvent = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPrompt,
    getServerInstallPrompt,
  );
  const env = useSyncExternalStore(subscribeNothing, getInstallEnv, getServerInstallEnv);

  const isInstallable = enabled && env !== 'installed';
  const mode: InstallMode = !isInstallable
    ? null
    : promptEvent
      ? 'prompt'
      : env === 'ios'
        ? 'ios'
        : null;

  return { mode, install: runInstallPrompt };
}
