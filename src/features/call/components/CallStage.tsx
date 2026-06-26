'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { cn } from '@/lib/utils/cn';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallPro } from '@/features/call/hooks/useCallPro';
import type { CallDirectory, CallPeer, CallType } from '@/features/call/types';
import { CallGrid } from './CallGrid';
import { QualityDot } from './QualityDot';

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

  return (
    <RemoteVideoStage
      remoteId={remoteIds[0]}
      statusText={statusText}
      getRemoteRef={getRemoteRef}
      setLocalEl={setLocalEl}
    />
  );
}

type RemoteVideoStageProps = {
  remoteId: string | undefined;
  statusText: string;
  getRemoteRef: (id: string) => (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
};

/** Khung video 1-1: remote full + PiP local, kèm viền active speaker, icon chất lượng, mute-cho-tôi. */
function RemoteVideoStage({
  remoteId,
  statusText,
  getRemoteRef,
  setLocalEl,
}: RemoteVideoStageProps) {
  const activeSpeakers = useCallStore((s) => s.activeSpeakers);
  const quality = useCallStore((s) => s.quality);
  const mutedForMe = useCallStore((s) => s.mutedForMe);
  const { toggleMute } = useCallPro();
  const speaking = remoteId ? activeSpeakers.includes(remoteId) : false;
  const muted = remoteId ? mutedForMe.includes(remoteId) : false;

  return (
    <div
      className={cn(
        'relative flex-1 overflow-hidden bg-black ring-2 transition-colors',
        speaking ? 'ring-primary' : 'ring-transparent',
      )}
    >
      {remoteId ? (
        <div ref={getRemoteRef(remoteId)} className="absolute inset-0 flex items-center justify-center" />
      ) : (
        <div className="absolute inset-0" />
      )}
      {remoteId && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
          {quality[remoteId] && <QualityDot quality={quality[remoteId]} />}
          <button
            type="button"
            aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
            onClick={() => toggleMute(remoteId)}
            className="grid h-6 w-6 place-items-center rounded-md bg-black/40 text-white hover:bg-black/60"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
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
