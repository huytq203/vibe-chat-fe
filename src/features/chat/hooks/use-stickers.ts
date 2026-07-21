'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stickerApi } from '@/services/stickers.api';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';
import type { Sticker } from '@/features/chat/types/sticker';

export const STICKERS_QUERY_KEY = ['stickers', 'me'] as const;

export function useMyStickers() {
  return useQuery({ queryKey: STICKERS_QUERY_KEY, queryFn: stickerApi.getMyStickers, staleTime: 5 * 60_000 });
}

export function useSendSticker(conversationId: string) {
  const send = useSendMessage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sticker: Sticker) => {
      await send.mutateAsync({ conversationId, type: 'STICKER', metadata: { stickerId: sticker.id } });
      void stickerApi.markUsed(sticker.id).then(() => queryClient.invalidateQueries({ queryKey: STICKERS_QUERY_KEY })).catch(() => undefined);
    },
  });
}
