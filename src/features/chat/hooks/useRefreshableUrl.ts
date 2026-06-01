'use client';

import { useCallback, useState } from 'react';
import { chatApi } from '@/services/chat.api';

const MAX_URL_REFRESH = 2;

/**
 * Quản lý URL hiển thị của attachment: ưu tiên URL truyền vào (blob preview cục
 * bộ hoặc downloadUrl ký sẵn nhúng trong message). URL ký sẵn có TTL → khi
 * <img>/<video> lỗi (hết hạn), refresh qua endpoint scoped theo conversation.
 */
export function useRefreshableUrl(
  conversationId: string,
  mediaId: string | null,
  initialUrl: string | null,
  canRefresh: boolean,
) {
  const [url, setUrl] = useState(initialUrl);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Reset khi initialUrl đổi (đổi message/URL) — điều chỉnh state ngay trong
  // render (pattern "previous value" của React), tránh setState trong effect.
  const [prevInitial, setPrevInitial] = useState(initialUrl);
  if (prevInitial !== initialUrl) {
    setPrevInitial(initialUrl);
    setUrl(initialUrl);
    setFailed(false);
    setAttempts(0);
  }

  const onError = useCallback(async () => {
    if (!canRefresh || !mediaId || attempts >= MAX_URL_REFRESH) {
      setFailed(true);
      return;
    }
    setAttempts((n) => n + 1);
    try {
      const data = await chatApi.getAttachmentUrl(conversationId, mediaId);
      if (data?.downloadUrl) setUrl(data.downloadUrl);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [conversationId, mediaId, canRefresh, attempts]);

  return { url: failed ? null : url, onError };
}
