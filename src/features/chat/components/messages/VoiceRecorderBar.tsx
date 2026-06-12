'use client';

import { Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type VoiceRecorderBarProps = {
  elapsedMs: number;
  sending: boolean;
  onCancel: () => void;
  onSend: () => void;
};

/** Thanh hiển thị khi đang ghi âm: huỷ · đếm giờ · gửi. */
export function VoiceRecorderBar({ elapsedMs, sending, onCancel, onSend }: VoiceRecorderBarProps) {
  return (
    <div className="flex flex-1 items-center gap-3 px-1.5 py-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCancel}
        disabled={sending}
        aria-label="Huỷ ghi âm"
        title="Huỷ"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-[18px] w-[18px]" />
      </Button>
      <span className="flex items-center gap-2 text-[13px] text-foreground">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            sending ? 'bg-muted-foreground' : 'animate-pulse bg-destructive',
          )}
        />
        {sending ? 'Đang gửi…' : `Đang ghi… ${fmt(elapsedMs)}`}
      </span>
      <div className="flex-1" />
      <Button
        variant="solid"
        size="icon-sm"
        onClick={onSend}
        isLoading={sending}
        aria-label="Gửi tin nhắn thoại"
        title="Gửi"
        className="shrink-0"
      >
        {!sending && <Send className="h-[18px] w-[18px]" />}
      </Button>
    </div>
  );
}
