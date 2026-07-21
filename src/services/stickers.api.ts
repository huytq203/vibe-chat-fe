import { apiClient } from '@/lib/api/client';
import type { MyStickers, StickerPack } from '@/features/chat/types/sticker';

export const stickerApi = {
  getMyStickers: () => apiClient.get<MyStickers>('/api/v1/me/stickers'),
  browsePacks: (params: { q?: string; page: number; limit: number }) =>
    apiClient.get<StickerPack[]>('/api/v1/sticker-packs', { query: params }),
  getPack: (slug: string) => apiClient.get<StickerPack>(`/api/v1/sticker-packs/${slug}`),
  addPack: (slug: string) => apiClient.post<{ ok: true }>(`/api/v1/me/stickers/packs/${slug}`, { body: {} }),
  removePack: (slug: string) => apiClient.delete<{ ok: true }>(`/api/v1/me/stickers/packs/${slug}`),
  markUsed: (id: string) => apiClient.post<{ ok: true }>(`/api/v1/me/stickers/${id}/used`, { body: {} }),
} as const;
