'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';

interface ConnectionIndicatorProps {
  status: UseCollabDocResult['status'];
  isSynced: boolean;
  error: string | null;
}

function useCapacityToast(error: string | null): void {
  const shownError = useRef<string | null>(null);
  useEffect(() => {
    if (!error || shownError.current === error || !/\b50\b/.test(error)) return;
    shownError.current = error;
    toast.error(error);
  }, [error]);
}

export function ConnectionIndicator({
  status,
  isSynced,
  error,
}: ConnectionIndicatorProps) {
  useCapacityToast(error);
  if (!error && status === 'connected' && isSynced) return null;

  if (error) {
    return (
      <span className="pointer-events-none flex min-w-0 items-center gap-2 text-xs text-muted-foreground" role="status">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-danger" />
        <span className="max-w-64 truncate" title={error}>{error}</span>
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span className="pointer-events-none flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground" role="status">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-muted-foreground" />
        Đang lưu cục bộ
      </span>
    );
  }

  return (
    <span className="pointer-events-none flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground" role="status">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning motion-safe:animate-pulse" />
      Đang kết nối
    </span>
  );
}
