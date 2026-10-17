'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appVersionApi } from '@/services/app-version.api';
import { appVersionKeys } from '@/services/keys';
import { APP_VERSION } from '@/lib/version/app-version';
import { NO_UPDATE, resolveUpdateState, type AppUpdateState } from '../lib/resolve-update';
import { resolveUpdateTarget } from '../lib/runtime';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const STALE_TIME_MS = 5 * 60 * 1000;

export type UpdateManifestResult = {
  state: AppUpdateState;
  isEnabled: boolean;
  isChecking: boolean;
  isError: boolean;
  check: () => Promise<AppUpdateState>;
};

/** Kiểm tra định kỳ + mỗi lần quay lại cửa sổ. Lỗi mạng chỉ làm im lặng, không chặn app. */
export function useUpdateManifest(): UpdateManifestResult {
  // Đọc 1 lần ở client: isElectron()/env không đổi trong vòng đời trang.
  const [target] = useState(resolveUpdateTarget);
  const url = target.manifestUrl;

  const query = useQuery({
    queryKey: appVersionKeys.manifest(url ?? 'disabled'),
    queryFn: () => {
      if (!url) throw new Error('Chưa cấu hình URL kiểm tra phiên bản');
      return appVersionApi.getManifest(url);
    },
    enabled: url !== null,
    refetchInterval: CHECK_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: STALE_TIME_MS,
    retry: 1,
  });

  const ctx = useMemo(() => ({ currentVersion: APP_VERSION, platform: target.platform }), [target]);
  const state = useMemo(
    () => (query.data ? resolveUpdateState(query.data, ctx) : NO_UPDATE),
    [query.data, ctx],
  );

  const { refetch } = query;
  const check = useCallback(async (): Promise<AppUpdateState> => {
    const result = await refetch();
    return result.data ? resolveUpdateState(result.data, ctx) : NO_UPDATE;
  }, [refetch, ctx]);

  return {
    state,
    isEnabled: url !== null,
    isChecking: query.isFetching,
    isError: query.isError,
    check,
  };
}
