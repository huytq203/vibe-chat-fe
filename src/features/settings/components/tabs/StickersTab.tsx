'use client';

/* Sticker WebP có thể động nên chủ động dùng img thay vì bộ tối ưu ảnh tĩnh. */
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useMyStickers, STICKERS_QUERY_KEY } from '@/features/chat/hooks/use-stickers';
import { stickerApi } from '@/services/stickers.api';
import { SettingsSection } from '../SettingsSection';

export function StickersTab() {
  const [query, setQuery] = useState('');
  const client = useQueryClient();
  const { data: mine } = useMyStickers();
  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['stickers', 'catalog', query],
    queryFn: () => stickerApi.browsePacks({ q: query || undefined, page: 1, limit: 30 }),
  });
  const installed = useMemo(() => new Set(mine?.packs.map((pack) => pack.slug)), [mine]);
  const update = useMutation({
    mutationFn: ({ slug, add }: { slug: string; add: boolean }) => add ? stickerApi.addPack(slug) : stickerApi.removePack(slug),
    onSuccess: (_, variables) => { void client.invalidateQueries({ queryKey: STICKERS_QUERY_KEY }); toast.success(variables.add ? 'Đã thêm bộ sticker' : 'Đã gỡ bộ sticker'); },
    onError: () => toast.error('Không thể cập nhật thư viện sticker'),
  });

  return (
    <SettingsSection title="Sticker" desc="Thêm hoặc gỡ các bộ sticker xuất hiện trong khung soạn tin.">
      <label className="mb-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 focus-within:border-primary">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bộ sticker" className="h-auto border-0 p-0 shadow-none focus-visible:ring-0" />
      </label>
      {isLoading ? <p className="text-xs text-muted-foreground">Đang tải sticker…</p> : catalog.length === 0 ? <p className="text-xs text-muted-foreground">Không tìm thấy bộ sticker phù hợp.</p> : (
        <div className="divide-y divide-border">
          {catalog.map((pack) => {
            const added = installed.has(pack.slug);
            return <div key={pack.id} className="flex items-center gap-3 py-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted">{pack.coverUrl ? <img src={pack.coverUrl} alt="" className="h-10 w-10 object-contain" /> : <span className="text-xl">🙂</span>}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{pack.title}</p><p className="text-xs text-muted-foreground">{pack.stickerCount} sticker{pack.isOfficial ? ' · Chính thức' : ''}</p></div>
              <Button size="sm" variant={added ? 'ghost' : 'outline'} disabled={update.isPending} onClick={() => update.mutate({ slug: pack.slug, add: !added })}>{added ? 'Gỡ' : 'Thêm'}</Button>
            </div>;
          })}
        </div>
      )}
    </SettingsSection>
  );
}
