'use client';

import { Phone } from 'lucide-react';
import { useCallStore } from '@/features/call/stores/call.store';

/**
 * Dải đỏ dưới ChatHeader báo cuộc gọi đang diễn ra khi cửa sổ call bị thu gọn.
 * Click để mở lại cửa sổ. Render trong ChatPanel ngay dưới ChatHeader.
 */
export function CallBanner() {
  const phase = useCallStore((s) => s.phase);
  const windowOpen = useCallStore((s) => s.windowOpen);
  const peerName = useCallStore((s) => s.call?.peer.name ?? '');

  const active = phase === 'ongoing' || phase === 'outgoing';
  if (!active || windowOpen) return null;

  return (
    <button
      type="button"
      onClick={() => useCallStore.getState().setWindowOpen(true)}
      className="flex w-full shrink-0 items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-sm font-medium text-white hover:bg-destructive/90"
    >
      <Phone className="h-4 w-4 animate-pulse" />
      <span>
        {phase === 'outgoing' ? 'Đang gọi' : 'Cuộc gọi đang diễn ra'}
        {peerName ? ` · ${peerName}` : ''} — nhấn để mở
      </span>
    </button>
  );
}
