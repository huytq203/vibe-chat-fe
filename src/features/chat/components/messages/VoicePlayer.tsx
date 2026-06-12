'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function fmt(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type VoicePlayerProps = {
  url: string | null;
  /** Thời lượng (giây) từ attachment — fallback khi chưa load được metadata. */
  durationSec: number | null;
  isMe: boolean;
  onError: () => void;
};

/** Player tin nhắn thoại: play/pause + thanh tua + thời gian. Nghe trực tiếp như Zalo/Mess. */
export function VoicePlayer({ url, durationSec, isMe, onError }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(durationSec ?? 0);

  if (!url) {
    return <span className="text-[12px] italic opacity-70">Không tải được tin nhắn thoại</span>;
  }

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play();
  };

  const seek = (e: ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !total) return;
    a.currentTime = (Number(e.target.value) / 100) * total;
    setCurrent(a.currentTime);
  };

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2.5 py-0.5', isMe ? 'text-primary-foreground' : 'text-foreground')}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onError={onError}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full',
          isMe ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary',
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={seek}
        aria-label="Thanh tua tin nhắn thoại"
        className={cn(
          'h-1 w-28 cursor-pointer appearance-none rounded-full',
          isMe ? 'bg-primary-foreground/30 accent-primary-foreground' : 'bg-primary/20 accent-primary',
        )}
      />
      <span className="w-9 shrink-0 text-[11px] tabular-nums opacity-80">
        {fmt(current > 0 ? current : total)}
      </span>
    </div>
  );
}
