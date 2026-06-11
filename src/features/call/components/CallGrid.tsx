'use client';

import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallDirectory } from '@/features/call/types';

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
};

/** 1 ô lưới: video track phủ lên avatar fallback (audio / tắt cam → hiện avatar). */
function CallTile({ name, avatarUrl, videoRef }: TileProps) {
  return (
    <div className="relative min-h-0 overflow-hidden rounded-lg bg-sidebar">
      <div className="absolute inset-0 flex items-center justify-center">
        <Avatar name={name} src={avatarUrl} size="lg" />
      </div>
      <div ref={videoRef} className="absolute inset-0" />
      <span className="absolute bottom-1 left-2 z-10 max-w-[90%] truncate text-xs text-white drop-shadow">
        {name}
      </span>
    </div>
  );
}

/** Lưới video/audio cho group (không giới hạn người): ô của mình + mỗi remote 1 ô. */
export function CallGrid({ directory, remoteIds, getRemoteRef, setLocalEl }: CallGridProps) {
  const total = remoteIds.length + 1;
  const cols = Math.ceil(Math.sqrt(total));

  return (
    <div
      className="grid flex-1 gap-1.5 overflow-hidden bg-black p-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      <CallTile name="Bạn" avatarUrl={null} videoRef={setLocalEl} />
      {remoteIds.map((id) => {
        const member = directory[id];
        return (
          <CallTile
            key={id}
            name={member?.name ?? 'Thành viên'}
            avatarUrl={member?.avatarUrl ?? null}
            videoRef={getRemoteRef(id)}
          />
        );
      })}
    </div>
  );
}
