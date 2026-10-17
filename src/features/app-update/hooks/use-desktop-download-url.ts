'use client';

import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appVersionApi } from '@/services/app-version.api';
import { appVersionKeys } from '@/services/keys';
import { detectDesktopPlatform } from '../lib/detect-desktop-platform';
import { resolveUpdateTarget } from '../lib/runtime';

const subscribeNoop = (): (() => void) => () => undefined;
const readUserAgent = (): string => navigator.userAgent;
const readServerUserAgent = (): string => '';

/**
 * Link tải bộ cài cho máy tính của người đang xem web, lấy từ `/version.json`.
 * Trả null trong app desktop, trên điện thoại, hoặc khi chưa cấu hình link cho OS này.
 */
export function useDesktopDownloadUrl(): string | null {
  const [target] = useState(resolveUpdateTarget);
  const userAgent = useSyncExternalStore(subscribeNoop, readUserAgent, readServerUserAgent);
  const platform = detectDesktopPlatform(userAgent);
  const isWeb = target.platform === null;

  const { data } = useQuery({
    queryKey: appVersionKeys.manifest(target.manifestUrl ?? 'disabled'),
    queryFn: () => appVersionApi.getManifest(target.manifestUrl ?? ''),
    enabled: isWeb && platform !== null && target.manifestUrl !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (!isWeb || !platform) return null;
  return data?.desktop?.downloads[platform] ?? null;
}
