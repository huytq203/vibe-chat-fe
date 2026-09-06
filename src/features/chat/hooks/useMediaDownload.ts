'use client';

import { useCallback, useState } from 'react';
import { mediaApi } from '@/services/media.api';
import { chatApi } from '@/services/chat.api';
import { triggerSave } from '@/features/chat/utils';

/**
 * Tải attachment về máy. URL ký sẵn S3 cross-origin nên không dùng được
 * `<a download>` → lấy Blob rồi ép tải qua object URL. Nếu URL hết hạn (403)
 * thì xin URL mới scoped theo conversation rồi thử lại 1 lần.
 *
 * Là hàm thuần (không phải hook) để chỗ nào không gọi hook được — ví dụ dựng
 * handler cho từng slide của lightbox trong vòng lặp — vẫn dùng lại được.
 *
 * @returns `true` nếu đã lưu được file.
 */
export async function downloadMedia(
  conversationId: string,
  mediaId: string | null,
  fileName: string,
  initialUrl: string | null,
  onProgress?: (percent: number) => void,
): Promise<boolean> {
  const save = async (url: string) => {
    triggerSave(await mediaApi.download(url, onProgress), fileName);
  };
  const refresh = async (): Promise<string | null> => {
    if (!mediaId) return null;
    try {
      const data = await chatApi.getAttachmentUrl(conversationId, mediaId);
      return data?.downloadUrl ?? null;
    } catch {
      return null;
    }
  };

  // Ảnh/tệp optimistic đang hiển thị bằng object URL: bytes đã nằm sẵn trong
  // trình duyệt, lưu thẳng — không cần (và cũng chưa thể) hỏi lại URL ký sẵn.
  if (initialUrl?.startsWith('blob:')) {
    try {
      triggerSave(await (await fetch(initialUrl)).blob(), fileName);
      return true;
    } catch {
      // Object URL đã bị revoke → rơi xuống nhánh ký lại bên dưới.
    }
  }

  try {
    const url = initialUrl?.startsWith('blob:') ? await refresh() : initialUrl ?? (await refresh());
    if (!url) return false;
    await save(url);
    return true;
  } catch {
    const fresh = await refresh();
    if (!fresh) return false;
    try {
      await save(fresh);
      return true;
    } catch {
      return false; // bỏ qua — user có thể bấm lại
    }
  }
}

/** Bọc {@link downloadMedia} kèm trạng thái tiến độ (%) cho UI. */
export function useMediaDownload(conversationId: string, mediaId: string | null, fileName: string) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const download = useCallback(
    async (initialUrl: string | null) => {
      if (downloading) return;
      setDownloading(true);
      setProgress(0);
      try {
        await downloadMedia(conversationId, mediaId, fileName, initialUrl, setProgress);
      } finally {
        setDownloading(false);
      }
    },
    [downloading, conversationId, mediaId, fileName],
  );

  return { downloading, progress, download };
}
