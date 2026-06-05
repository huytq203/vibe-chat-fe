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

  // Khoá URL hiển thị theo mediaId, KHÔNG theo chuỗi initialUrl. Khi message list
  // refetch, BE ký lại signed URL khác cho CÙNG file → nếu reset theo URL sẽ làm
  // <video>/<img> đổi src và tải lại file nặng. Chỉ reset khi đổi sang media khác;
  // URL hết hạn thật sẽ được làm mới qua onError. Pattern "previous value" của React.
  const [prevMediaId, setPrevMediaId] = useState(mediaId);
  if (prevMediaId !== mediaId) {
    setPrevMediaId(mediaId);
    setUrl(initialUrl);
    setFailed(false);
    setAttempts(0);
  } else if (url === null && !failed && initialUrl) {
    // Cùng media nhưng trước đó chưa có URL (vd tin về trước, downloadUrl đến sau)
    // → nhận URL đầu tiên. Sau khi set, url khác null nên không lặp.
    setUrl(initialUrl);
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
