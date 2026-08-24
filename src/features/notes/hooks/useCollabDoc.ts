'use client';

import { type SetStateAction, useEffect, useState } from 'react';

import {
  createCollabSession,
  type CollabConnectionStatus,
  type CollabProvider,
  type YDoc,
} from '@/lib/collab';
import { apiAuth } from '@/lib/api/client';

export interface UseCollabDocResult {
  doc: YDoc | null;
  provider: CollabProvider | null;
  status: CollabConnectionStatus | 'offline';
  isSynced: boolean;
  error: string | null;
}
type CollabState = UseCollabDocResult & { pageId: string | null };

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && !navigator.onLine;

function emptyState(): CollabState {
  const status = isOffline() ? 'offline' : 'disconnected';
  return { doc: null, provider: null, status, isSynced: false, error: null, pageId: null };
}

export function useCollabDoc(
  pageId: string,
  options: { enabled?: boolean } = {},
): UseCollabDocResult {
  const enabled = options.enabled !== false && pageId.length > 0;
  const [state, setState] = useState<CollabState>(emptyState);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const updateState = (next: SetStateAction<CollabState>) =>
      queueMicrotask(() => active && setState(next));
    let connectionStatus: CollabConnectionStatus = 'connecting';
    const session = createCollabSession({
      pageId,
      getToken: async () => apiAuth.getToken(),
      onProvider: (provider) => updateState((value) => ({ ...value, provider })),
      onSynced: () => updateState((value) => ({ ...value, isSynced: true })),
      onAuthenticationFailed: (error) =>
        updateState((value) => ({ ...value, error })),
      onError: (error) => updateState((value) => ({ ...value, error })),
      onStatus: (status) => {
        connectionStatus = status;
        updateState((value) => ({
          ...value,
          status: isOffline() ? 'offline' : status,
          error: status === 'connected' ? null : value.error,
        }));
      },
    });
    updateState({
      ...emptyState(),
      doc: session.doc,
      pageId,
      status: isOffline() ? 'offline' : 'connecting',
    });
    const handleOffline = () => updateState((value) => ({ ...value, status: 'offline' }));
    const handleOnline = () => updateState((value) => ({ ...value, status: connectionStatus }));
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      active = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      session.destroy();
    };
  }, [enabled, pageId]);
  return enabled && state.pageId === pageId ? state : emptyState();
}
