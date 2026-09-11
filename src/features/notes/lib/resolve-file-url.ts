import { attachmentsApi } from '@/services/notion-attachments.api';

const ATTACHMENT_URL_PATTERN = /^attachment:\/\/(.+)$/;
// Dưới hạn thật của presigned URL (S3_DOWNLOAD_URL_TTL_SECONDS, mặc định
// 7200s ở BE) để không bao giờ phục vụ một URL đã hết hạn.
const CACHE_TTL_MS = 25 * 60 * 1000;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Nhận giá trị tệp đã lưu trong tài liệu
 * (`attachment://<id>`, xem D2/G1 của plan) và trả URL thật để hiển thị.
 * URL khác dạng `attachment://` (ảnh ngoài, sẵn có) trả nguyên văn.
 */
export async function resolveAttachmentFileUrl(url: string): Promise<string> {
  const match = ATTACHMENT_URL_PATTERN.exec(url);
  if (!match) return url;
  const attachmentId = match[1];

  const cached = cache.get(attachmentId);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { url: resolvedUrl } = await attachmentsApi.getUrl(attachmentId);
  cache.set(attachmentId, { url: resolvedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return resolvedUrl;
}
