import { apiClient, apiAuth, resolveApiUrl, ApiError } from '@/lib/api/client';
import type {
  MediaResponse,
  MediaCategory,
  MediaDimensions,
  PresignInput,
  PresignResponse,
} from '@/features/chat/types';

/**
 * Media REST transport — tham chiếu FRONTEND/14-media-upload.md.
 * Pure transport: không đụng cache/state. Hook orchestrate ở features/chat/hooks/*.
 *
 * Upload nhị phân (multipart & PUT thẳng storage) dùng XMLHttpRequest để có
 * tiến trình (%). Các thao tác JSON (presign/confirm/get/delete) qua apiClient
 * để hưởng refresh-token + envelope unwrap.
 */

export type ProgressFn = (percent: number) => void;

type XhrOptions = {
  method: 'POST' | 'PUT';
  url: string;
  body: FormData | File | Blob;
  headers?: Record<string, string>;
  onProgress?: ProgressFn;
  /** true → parse JSON envelope và trả `data`. false → trả null (storage PUT). */
  parseJson: boolean;
};

function xhrSend<T>(opts: XhrOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url, true);
    if (opts.parseJson) xhr.withCredentials = true;
    for (const [k, v] of Object.entries(opts.headers ?? {})) {
      xhr.setRequestHeader(k, v);
    }

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!opts.parseJson) return resolve(null as T);
        try {
          const json = JSON.parse(xhr.responseText) as { data: T };
          resolve(json.data);
        } catch {
          reject(new ApiError(xhr.status, 'MEDIA_PARSE_ERROR', 'Không đọc được phản hồi upload'));
        }
        return;
      }
      // Thử bóc error envelope của BE; storage trả XML/plain → fallback.
      let code = 'MEDIA_UPLOAD_FAILED';
      let message = xhr.statusText || 'Upload thất bại';
      try {
        const body = JSON.parse(xhr.responseText) as { error?: { code?: string; message?: string } };
        if (body?.error?.code) code = body.error.code;
        if (body?.error?.message) message = body.error.message;
      } catch {
        /* non-JSON (storage) */
      }
      reject(new ApiError(xhr.status, code, message));
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Lỗi mạng khi upload'));
    xhr.onabort = () => reject(new ApiError(0, 'UPLOAD_ABORTED', 'Đã huỷ upload'));

    xhr.send(opts.body);
  });
}

export const mediaApi = {
  /** Cách A — upload trực tiếp (file nhỏ ≤ 10MB). */
  uploadDirect: (file: File, category: MediaCategory, onProgress?: ProgressFn) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    const token = apiAuth.getToken();
    return xhrSend<MediaResponse>({
      method: 'POST',
      url: resolveApiUrl('/api/v1/media/upload'),
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      onProgress,
      parseJson: true,
    });
  },

  /** Cách B.1 — xin presigned URL. */
  presign: (input: PresignInput) =>
    apiClient.post<PresignResponse>('/api/v1/media/presign', { body: input }),

  /** Cách B.2 — PUT file thẳng storage (Content-Type PHẢI khớp presign). */
  putToStorage: (uploadUrl: string, file: File, contentType: string, onProgress?: ProgressFn) =>
    xhrSend<null>({
      method: 'PUT',
      url: uploadUrl,
      body: file,
      headers: { 'Content-Type': contentType },
      onProgress,
      parseJson: false,
    }),

  /** Cách B.3 — xác nhận upload xong → READY. */
  confirm: (id: string, dimensions: MediaDimensions = {}) =>
    apiClient.post<MediaResponse>(`/api/v1/media/${id}/confirm`, { body: dimensions }),

  /**
   * Tải file ký sẵn về Blob kèm tiến độ. URL S3 là cross-origin nên thuộc tính
   * `download` của <a> bị bỏ qua (chỉ mở tab) → phải lấy bytes rồi ép tải qua
   * object URL same-origin. Không gắn auth/credentials (URL đã ký sẵn).
   */
  download: (url: string, onProgress?: ProgressFn) =>
    new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      if (onProgress) {
        xhr.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as Blob);
        else reject(new ApiError(xhr.status, 'MEDIA_DOWNLOAD_FAILED', 'Tải tệp thất bại'));
      };
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Lỗi mạng khi tải'));
      xhr.send();
    }),

  /** Lấy metadata + downloadUrl mới (refresh URL hết hạn). */
  get: (id: string) => apiClient.get<MediaResponse>(`/api/v1/media/${id}`),

  /** Xoá media (chỉ chủ sở hữu). */
  remove: (id: string) => apiClient.delete<void>(`/api/v1/media/${id}`),
} as const;
