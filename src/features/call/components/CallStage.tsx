'use client';

import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallPeer, CallType } from '@/features/call/types';

type CallStageProps = {
  type: CallType;
  peer: CallPeer;
  /** Callback ref — re-attach video track mỗi khi container mount lại (đổi mode). */
  setRemoteEl: (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
  statusText: string;
};

/** Vùng hiển thị media. Video: remote full + local PiP. Audio: avatar + status. */
export function CallStage({ type, peer, setRemoteEl, setLocalEl, statusText }: CallStageProps) {
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
  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      <div ref={setRemoteEl} className="absolute inset-0 flex items-center justify-center" />
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
