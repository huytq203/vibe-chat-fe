'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { mediaApi } from '@/services/media.api';
import { useSendMessage } from './use-mutations';
import { useVoiceRecorder } from './useVoiceRecorder';
import { buildOptimisticAttachment } from './useAttachments';

/**
 * Ghi âm → upload trực tiếp (Cách A — POST /media/upload, category VOICE; xem 14-media-upload.md)
 * → gửi tin type AUDIO. Hiển thị optimistic ngay bằng blob cục bộ để nghe liền trước khi BE echo.
 * Voice (opus) gần như luôn ≤10MB nên dùng upload trực tiếp, không cần presign.
 */
export function useVoiceMessage(conversationId: string) {
  const recorder = useVoiceRecorder();
  const send = useSendMessage();
  const [sending, setSending] = useState(false);

  const stopAndSend = useCallback(async () => {
    const rec = await recorder.stop();
    if (!rec) return;
    setSending(true);
    try {
      const media = await mediaApi.uploadDirect(rec.file, 'VOICE');
      // Container webm thường báo duration sai → ưu tiên thời lượng đo từ recorder cho player.
      const optimistic = buildOptimisticAttachment(media);
      send.mutate({
        conversationId,
        clientNonce: crypto.randomUUID(),
        type: 'AUDIO',
        attachmentIds: [media.id],
        previewUrl: URL.createObjectURL(rec.file),
        optimisticAttachment: { ...optimistic, duration: optimistic.duration ?? rec.durationSec },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gửi tin nhắn thoại thất bại');
    } finally {
      setSending(false);
    }
  }, [recorder, send, conversationId]);

  return { recorder, sending, stopAndSend };
}
