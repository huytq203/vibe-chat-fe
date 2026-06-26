'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { cn } from '@/lib/utils/cn';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallPro } from '@/features/call/hooks/useCallPro';
import type { CallDirectory, QualityLevel } from '@/features/call/types';
import { QualityDot } from './QualityDot';

type CallGridProps = {
  directory: CallDirectory;
  remoteIds: string[];
  getRemoteRef: (id: string) => (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
};

type TileProps = {
  name: string;
  avatarUrl: string | null;
  videoRef: (node: HTMLDivElement | null) => void;
  /** identity remote; bỏ trống = ô của mình (không quality/mute). */
  identity?: string;
  speaking: boolean;
  quality?: QualityLevel;
  muted?: boolean;
  onToggleMute?: () => void;
};

/** 1 ô lưới: video phủ avatar; viền sáng khi đang nói; remote có icon sóng + nút mute-cho-tôi. */
function CallTile({
  name,
  avatarUrl,
  videoRef,
  identity,
  speaking,
  quality,
  muted,
  onToggleMute,
}: TileProps) {
  return (
    <div
      className={cn(
        'relative min-h-0 overflow-hidden rounded-lg bg-sidebar ring-2 transition-colors',
        speaking ? 'ring-primary' : 'ring-transparent',
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Avatar name={name} src={avatarUrl} size="lg" />
      </div>
      <div ref={videoRef} className="absolute inset-0" />
      {identity && (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5">
          {quality && <QualityDot quality={quality} />}
          <button
            type="button"
            aria-label={muted ? `Bật tiếng ${name}` : `Tắt tiếng ${name}`}
            onClick={onToggleMute}
            className="grid h-6 w-6 place-items-center rounded-md bg-black/40 text-white hover:bg-black/60"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <span className="absolute bottom-1 left-2 z-10 max-w-[90%] truncate text-xs text-white drop-shadow">
        {name}
      </span>
    </div>
  );
}

/** Lưới video/audio cho group (không giới hạn người): ô của mình + mỗi remote 1 ô. */
export function CallGrid({ directory, remoteIds, getRemoteRef, setLocalEl }: CallGridProps) {
  const activeSpeakers = useCallStore((s) => s.activeSpeakers);
  const quality = useCallStore((s) => s.quality);
  const mutedForMe = useCallStore((s) => s.mutedForMe);
  const { toggleMute } = useCallPro();
  const total = remoteIds.length + 1;
  const cols = Math.ceil(Math.sqrt(total));

  return (
    <div
      className="grid flex-1 gap-1.5 overflow-hidden bg-black p-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      <CallTile name="Bạn" avatarUrl={null} videoRef={setLocalEl} speaking={false} />
      {remoteIds.map((id) => {
        const member = directory[id];
        return (
          <CallTile
            key={id}
            identity={id}
            name={member?.name ?? 'Thành viên'}
            avatarUrl={member?.avatarUrl ?? null}
            videoRef={getRemoteRef(id)}
            speaking={activeSpeakers.includes(id)}
            quality={quality[id]}
            muted={mutedForMe.includes(id)}
            onToggleMute={() => toggleMute(id)}
          />
        );
      })}
    </div>
  );
}
