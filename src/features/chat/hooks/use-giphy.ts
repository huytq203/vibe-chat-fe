'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GiphyError, giphyApi } from '@/services/giphy.api';
import { giphyKeys } from '@/services/keys';
import { mediaApi } from '@/services/media.api';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import type { GiphyItem } from '@/features/chat/types/gif';
import { buildOptimisticAttachment } from './useAttachments';
import { useSendMessage } from './use-mutations';

const MAX_GIF_BYTES = 8 * 1024 * 1024;

/** Nhận query đã debounce từ component để tránh spam request tìm kiếm. */
export function useGiphyGifs(query: string) {
  return useInfiniteQuery({
    queryKey: giphyKeys.list(query),
    queryFn: ({ pageParam }) => giphyApi.list({ q: query, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useSendGif(conversationId: string) {
  const send = useSendMessage();
  const replying = useMessageReplyStore((state) => state.replying);
  const cancelReply = useMessageReplyStore((state) => state.cancelReply);

  return useMutation<void, Error, GiphyItem>({
    mutationFn: async (gif) => {
      const blob = await giphyApi.fetchAsset(gif.id);
      if (blob.size > MAX_GIF_BYTES) {
        throw new GiphyError('GIF_TOO_LARGE', 'GIF này quá lớn để gửi.');
      }
      const file = new File([blob], `giphy-${gif.id}.gif`, { type: 'image/gif' });
      const media = await mediaApi.uploadDirect(file, 'ATTACHMENT');

      await send.mutateAsync({
        conversationId,
        type: 'IMAGE',
        attachmentIds: [media.id],
        clientNonce: crypto.randomUUID(),
        replyToMessageId:
          replying?.conversationId === conversationId ? replying.messageId : undefined,
        optimisticAttachment: buildOptimisticAttachment(media),
      });
      cancelReply();
    },
    onError: (error) => {
      toast.error(
        error instanceof GiphyError ? error.message : 'Gửi GIF thất bại. Bạn thử lại nhé.',
      );
    },
  });
}
