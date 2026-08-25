'use client';

import { useCallback } from 'react';
import { attachmentsApi } from '@/services/notion-attachments.api';

// Phải khớp MAX_ATTACHMENT_SIZE ở BE (attachments.service.ts, spec mục 4.7)
// — chặn ở đây để không tốn một lượt xin presign vô ích.
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

/**
 * Trả về hàm `uploadFile` để gắn thẳng vào `useCreateBlockNote({ uploadFile })`.
 * Giá trị trả về LUÔN là `attachment://<id>` — không phải URL thật — đúng dạng
 * mà BE-G-T1 (`document-content.service.ts`) giải khi dựng HTML/PDF/trang công
 * khai. Xem `resolveAttachmentFileUrl` để hiển thị URL thật lúc soạn thảo.
 */
export function useFileUpload(pageId: string) {
  return useCallback(async (file: File, blockId?: string): Promise<string> => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error('Tệp vượt quá 50MB, không thể tải lên');
    }
    const contentType = file.type || 'application/octet-stream';
    const presigned = await attachmentsApi.presign({
      pageId, blockId, fileName: file.name, mimeType: contentType, size: file.size,
    });
    await attachmentsApi.putToStorage(presigned.url, file, contentType);
    return `attachment://${presigned.attachmentId}`;
  }, [pageId]);
}
