'use client';

import { useState } from 'react';
import { Heart, History } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useMyStickers } from '@/features/chat/hooks/use-stickers';
import type { Sticker } from '@/features/chat/types/sticker';

export function StickerPicker({ onPick }: { onPick: (sticker: Sticker) => void }) {
  const { data, isLoading } = useMyStickers();
  const [tab, setTab] = useState('recent');
  if (isLoading) return <div className="h-72 w-80 p-4 text-sm text-muted-foreground">Đang tải sticker…</div>;
  const packs = data?.packs ?? [];
  const current = tab === 'recent' ? data?.recent ?? [] : tab === 'favorites' ? data?.favorites ?? [] : packs.find((pack) => pack.id === tab)?.stickers ?? [];
  return (
    <div className="flex h-80 w-80 flex-col" aria-label="Bảng chọn sticker">
      <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {[
          { id: 'recent', label: 'Gần đây', icon: <History className="h-4 w-4" /> },
          { id: 'favorites', label: 'Yêu thích', icon: <Heart className="h-4 w-4" /> },
        ].map((item) => (
          <button key={item.id} type="button" title={item.label} aria-label={item.label} onClick={() => setTab(item.id)} className={cn('flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-muted-foreground hover:bg-muted', tab === item.id && 'bg-muted text-primary')}>
            {item.icon}
          </button>
        ))}
        {packs.map((pack) => (
          <button key={pack.id} type="button" onClick={() => setTab(pack.id)} className={cn('h-8 min-w-8 rounded-md px-1 text-xs hover:bg-muted', tab === pack.id && 'bg-muted')} title={pack.title}>
            {pack.coverUrl ? <img src={pack.coverUrl} alt={pack.title} className="h-7 w-7 object-contain" /> : pack.title.slice(0, 2)}
          </button>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto p-2">
        {current.map((sticker) => (
          <button key={sticker.id} type="button" onClick={() => onPick(sticker)} className="flex h-16 w-16 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src={sticker.url} alt={sticker.emoji || 'Sticker'} loading="lazy" className="h-14 w-14 object-contain" />
          </button>
        ))}
      </div>
      {current.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">{packs.length === 0 ? 'Bạn chưa có bộ sticker nào. Nhắn @Stickers để tạo bộ riêng.' : 'Chưa có sticker trong mục này.'}</p>}
    </div>
  );
}
