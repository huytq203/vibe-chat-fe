'use client';

import { useCallback, useState } from 'react';
import { mediaApi } from '@/services/media.api';
import { chatApi } from '@/services/chat.api';
import { triggerSave } from '../utils';

/**
 * Tải attachment về máy kèm tiến độ (%). URL ký sẵn S3 cross-origin nên không
 * dùng được <a download> → lấy Blob rồi ép tải qua object URL. Nếu URL hết hạn
 * (403) thì xin URL mới scoped theo conversation rồi thử lại 1 lần.
 */
export function useMediaDownload(conversationId: string, mediaId: string | null, fileName: string) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const download = useCallback(
    async (initialUrl: string | null) => {
      if (downloading) return;
      setDownloading(true);
      setProgress(0);
      const save = async (url: string) => triggerSave(await mediaApi.download(url, setProgress), fileName);
      const refresh = async (): Promise<string | null> => {
        if (!mediaId) return null;
        try {
          const data = await chatApi.getAttachmentUrl(conversationId, mediaId);
          return data?.downloadUrl ?? null;
        } catch {
          return null;
        }
      };
      try {
        const url = initialUrl ?? (await refresh());
        if (!url) return;
        await save(url);
      } catch {
        const fresh = await refresh();
        if (fresh) {
          try {
            await save(fresh);
          } catch {
            /* bỏ qua — user có thể bấm lại */
          }
        }
      } finally {
        setDownloading(false);
      }
    },
    [downloading, conversationId, mediaId, fileName],
  );

  return { downloading, progress, download };
}
