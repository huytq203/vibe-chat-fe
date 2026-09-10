'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVersions } from '@/features/notes/hooks/use-query';
import type { PageVersion } from '@/features/notes/types';

interface UseAiPageChangeResult {
  changedVersion: PageVersion | null;
  checkForChange: () => Promise<void>;
  dismissChange: () => void;
}

function latestBeforeAi(versions: PageVersion[]): PageVersion | null {
  return versions
    .filter((version) => version.kind === 'BEFORE_AI')
    .reduce<PageVersion | null>((latest, version) => {
      if (!latest) return version;
      return Date.parse(version.createdAt) > Date.parse(latest.createdAt) ? version : latest;
    }, null);
}

export function useAiPageChange(pageId: string): UseAiPageChangeResult {
  const { refetch } = useVersions(pageId);
  const checkedAtRef = useRef<number | null>(null);
  const [changedVersion, setChangedVersion] = useState<PageVersion | null>(null);

  useEffect(() => {
    checkedAtRef.current = Date.now();
  }, []);

  const checkForChange = useCallback(async (): Promise<void> => {
    const checkedAt = checkedAtRef.current;
    const result = await refetch();
    if (result.isError || !result.data || checkedAt === null) return;
    checkedAtRef.current = Date.now();

    const latest = latestBeforeAi(result.data);
    if (latest && Date.parse(latest.createdAt) > checkedAt) setChangedVersion(latest);
  }, [refetch]);

  const dismissChange = useCallback(() => setChangedVersion(null), []);

  return { changedVersion, checkForChange, dismissChange };
}
