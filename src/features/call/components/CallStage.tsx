'use client';

import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallDirectory, CallPeer, CallType } from '@/features/call/types';
import { CallGrid } from './CallGrid';

type CallStageProps = {
  type: CallType;
  peer: CallPeer;
  isGroup: boolean;
  directory: CallDirectory;
  /** Identity remote đang trong room (lưới group / remote 1-1). */
  remoteIds: string[];
  getRemoteRef: (id: string) => (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
  statusText: string;
};

/**
 * Vùng hiển thị media.
 * - Group: lưới ô (mình + mỗi remote 1 ô), không giới hạn người.
 * - 1-1 video: remote full + local PiP.
 * - Audio: avatar + trạng thái.
 */
export function CallStage({
  type,
  peer,
  isGroup,
  directory,
  remoteIds,
  getRemoteRef,
  setLocalEl,
  statusText,
}: CallStageProps) {
  if (isGroup) {
    return (
      <CallGrid
        directory={directory}
        remoteIds={remoteIds}
        getRemoteRef={getRemoteRef}
        setLocalEl={setLocalEl}
      />
    );
  }

  if (type === 'AUDIO') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-sidebar">
        <Avatar name={peer.name} src={peer.avatarUrl} size="lg" />
        <div className="text-center">
          <p className="text-base font-medium text-foreground">{peer.name}</p>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      </div>
    );
  }

  const remoteId = remoteIds[0];
  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      {remoteId ? (
        <div ref={getRemoteRef(remoteId)} className="absolute inset-0 flex items-center justify-center" />
      ) : (
        <div className="absolute inset-0" />
      )}
      <div className="pointer-events-none absolute right-3 top-3 z-10 text-xs text-white/80">
        {statusText}
      </div>
      <div
        ref={setLocalEl}
        className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-lg border border-white/20 bg-black/40"
      />
    </div>
  );
}
