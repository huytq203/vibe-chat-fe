import { apiClient } from '@/lib/api/client';
import { attachmentDownloadUrlSchema, presignedUploadResultSchema } from '@/features/notes/schemas';

type PresignAttachmentInput = {
  pageId: string;
  blockId?: string;
  fileName: string;
  mimeType: string;
  size: number;
};

/** PUT nhị phân thẳng vào storage đã ký sẵn — không qua `apiClient` (khác
 * origin với notion-service), cùng pattern XMLHttpRequest với media.api.ts
 * để có tiến trình %. */
function putToStorage(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Tải tệp lên thất bại (mã ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Lỗi mạng khi tải tệp lên'));
    xhr.send(file);
  });
}

export const attachmentsApi = {
  presign: async (input: PresignAttachmentInput) => {
    const raw = await apiClient.post<unknown>('/api/v1/uploads/presign', {
      body: input, service: 'notion',
    });
    return presignedUploadResultSchema.parse(raw);
  },
  putToStorage,
  getUrl: async (attachmentId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/attachments/${attachmentId}/url`, {
      service: 'notion',
    });
    return attachmentDownloadUrlSchema.parse(raw);
  },
} as const;
