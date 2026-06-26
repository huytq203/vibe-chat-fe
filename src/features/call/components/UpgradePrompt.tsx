'use client';

import { Video } from 'lucide-react';
import { useCallStore } from '@/features/call/stores/call.store';

type UpgradePromptProps = {
  onAccept: () => void;
  onDecline: () => void;
};

/** Thanh hỏi đồng ý khi phía kia muốn chuyển cuộc gọi thoại sang video. */
export function UpgradePrompt({ onAccept, onDecline }: UpgradePromptProps) {
  const state = useCallStore((s) => s.upgrade.state);
  const byName = useCallStore((s) => {
    const by = s.upgrade.by;
    return by ? (s.call?.directory[by]?.name ?? 'Đối phương') : 'Đối phương';
  });

  if (state !== 'incoming') return null;

  return (
    <div className="flex items-center gap-2 border-t border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
      <Video className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-foreground">
        {byName} muốn chuyển sang video
      </span>
      <button
        type="button"
        onClick={onAccept}
        className="shrink-0 rounded-md bg-success px-3 py-1 text-xs font-medium text-white hover:bg-success/90"
      >
        Đồng ý
      </button>
      <button
        type="button"
        onClick={onDecline}
        className="shrink-0 rounded-md bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
      >
        Từ chối
      </button>
    </div>
  );
}
