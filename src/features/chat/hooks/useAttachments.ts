'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaApi } from '@/services/media.api';
import type {
  Attachment as MessageAttachment,
  MediaCategory,
  MediaDimensions,
  MediaResponse,
} from '@/features/chat/types';

export type AttachmentKind = 'image' | 'video' | 'file';
export type AttachmentStatus = 'idle' | 'uploading' | 'done' | 'error';

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  file: File;
  name: string;
  size: number;
  ext: string;
  /** Blob URL preview (ảnh/video) — revoke khi gỡ/clear. */
  previewUrl: string | null;
  status: AttachmentStatus;
  progress: number;
  media: MediaResponse | null;
  error: string | null;
};

// > 10MB hoặc video → bắt buộc dùng presigned URL (Cách B). Còn lại upload trực tiếp.
const DIRECT_MAX = 10 * 1024 * 1024;

// Fallback theo đuôi khi MIME rỗng/sai (file kéo từ máy có thể không có type).
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', '3gp', 'ogv']);

function getExt(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

function detectKind(file: File): AttachmentKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  const ext = getExt(file.name);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return 'file';
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Đọc kích thước ảnh từ blob (best-effort). */
function probeImage(file: File): Promise<MediaDimensions> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Đọc kích thước + thời lượng video từ blob (best-effort). */
function probeVideo(file: File): Promise<MediaDimensions> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

function pickCategory(kind: AttachmentKind): MediaCategory {
  return kind === 'video' ? 'VIDEO' : 'ATTACHMENT';
}

/** Dựng Attachment optimistic từ MediaResponse để hiển thị ngay (giống shape BE trả về). */
export function buildOptimisticAttachment(media: MediaResponse): MessageAttachment {
  return {
    mediaId: media.id,
    fileName: media.originalName,
    fileSize: media.size,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    duration: media.duration,
    downloadUrl: media.downloadUrl,
  };
}

export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const ref = useRef<Attachment[]>([]);
  // Promise upload đang chạy theo id — để submit chờ (không upload lại).
  const inflight = useRef<Map<string, Promise<MediaResponse | null>>>(new Map());

  const sync = useCallback((updater: (prev: Attachment[]) => Attachment[]) => {
    // Cập nhật ref ĐỒNG BỘ ngay (nguồn sự thật cho uploadAll/submit), rồi mới
    // setState để re-render. Nếu chỉ gán ref.current trong updater của setState,
    // nó chạy trễ → uploadAll() có thể đọc trạng thái cũ (media=null) và bỏ sót
    // file khi gửi (bug "lúc được lúc không").
    const next = updater(ref.current);
    ref.current = next;
    setAttachments(next);
  }, []);

  const patch = useCallback(
    (id: string, fields: Partial<Attachment>) => {
      sync((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    },
    [sync],
  );

  const uploadOne = useCallback(
    async (att: Attachment): Promise<MediaResponse | null> => {
      patch(att.id, { status: 'uploading', progress: 0, error: null });
      const onProgress = (p: number) => patch(att.id, { progress: p });
      try {
        let media: MediaResponse;
        if (att.kind !== 'video' && att.size <= DIRECT_MAX) {
          // Cách A — upload trực tiếp.
          media = await mediaApi.uploadDirect(att.file, 'ATTACHMENT', onProgress);
        } else {
          // Cách B — presign → PUT storage → confirm.
          const pre = await mediaApi.presign({
            category: pickCategory(att.kind),
            fileName: att.name,
            mimeType: att.file.type || 'application/octet-stream',
            fileSize: att.size,
          });
          await mediaApi.putToStorage(pre.uploadUrl, att.file, pre.contentType, onProgress);
          const dims =
            att.kind === 'image'
              ? await probeImage(att.file)
              : att.kind === 'video'
                ? await probeVideo(att.file)
                : {};
          media = await mediaApi.confirm(pre.id, dims);
        }
        patch(att.id, { status: 'done', progress: 100, media });
        return media;
      } catch (e) {
        patch(att.id, { status: 'error', error: (e as Error).message });
        return null;
      }
    },
    [patch],
  );

  // Bắt đầu upload ngầm 1 attachment (idempotent: bỏ qua nếu đang chạy).
  const startUpload = useCallback(
    (att: Attachment): Promise<MediaResponse | null> => {
      const running = inflight.current.get(att.id);
      if (running) return running;
      const p = uploadOne(att).finally(() => {
        inflight.current.delete(att.id);
      });
      inflight.current.set(att.id, p);
      return p;
    },
    [uploadOne],
  );

  const addFiles = useCallback(
    (files: FileList | File[], forcedKind?: AttachmentKind) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const next: Attachment[] = arr.map((file) => {
        // Tự nhận diện ảnh/video theo MIME/đuôi; forcedKind chỉ dùng khi không xác định được.
        const detected = detectKind(file);
        const kind = detected === 'file' ? (forcedKind ?? 'file') : detected;
        const isMedia = kind === 'image' || kind === 'video';
        return {
          id: makeId(),
          kind,
          file,
          name: file.name,
          size: file.size,
          ext: getExt(file.name),
          previewUrl: isMedia ? URL.createObjectURL(file) : null,
          status: 'idle',
          progress: 0,
          media: null,
          error: null,
        };
      });
      sync((prev) => [...prev, ...next]);
      // KHÔNG upload ngay (giữ file trong RAM trình duyệt). Chỉ upload S3 lúc bấm Gửi
      // (uploadAll) → ảnh chọn rồi huỷ KHÔNG bao giờ chạm S3, tránh rác/tràn dữ liệu.
    },
    [sync],
  );

  const remove = useCallback(
    // deleteRemote=true: user bấm X huỷ → xoá media mồ côi trên storage.
    // deleteRemote=false: vừa GỬI xong → message đang tham chiếu media, KHÔNG được xoá.
    (id: string, deleteRemote = true) => {
      // Side-effect NGOÀI updater: StrictMode gọi updater 2 lần → tránh delete đôi.
      const target = ref.current.find((a) => a.id === id);
      if (!target) return;
      if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (deleteRemote) {
        if (target.media) {
          void mediaApi.remove(target.media.id).catch(() => undefined);
        } else {
          // Gỡ khi upload còn chạy → chờ xong rồi xoá media mồ côi.
          const running = inflight.current.get(id);
          if (running) void running.then((m) => m && mediaApi.remove(m.id).catch(() => undefined));
        }
      }
      sync((prev) => prev.filter((a) => a.id !== id));
    },
    [sync],
  );

  const clear = useCallback(() => {
    sync((prev) => {
      prev.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  }, [sync]);

  // Xoá TẤT CẢ attachment đang preview (nút "Xoá tất cả"). Đi qua remove() từng cái để
  // vẫn dọn media mồ côi nếu lỡ có file đã upload (defensive). Snapshot id trước khi lặp.
  const removeAll = useCallback(() => {
    const ids = ref.current.map((a) => a.id);
    ids.forEach((id) => remove(id, true));
  }, [remove]);

  /**
   * Chờ các upload nền settle trước khi gửi. CHỈ khởi động item `idle` (chưa từng
   * chạy) — KHÔNG tự up lại item `error`: presign tạo media PENDING + object mới
   * mỗi lần, retry ngầm sẽ leak storage. Item lỗi do user chủ động xoá rồi chọn
   * lại. Trả snapshot sau khi tất cả settle.
   */
  const uploadAll = useCallback(async (): Promise<Attachment[]> => {
    ref.current.forEach((a) => {
      if (a.status === 'idle') startUpload(a);
    });
    await Promise.allSettled([...inflight.current.values()]);
    return ref.current;
  }, [startUpload]);

  // Revoke mọi blob URL còn sót khi unmount.
  useEffect(() => {
    return () => {
      ref.current.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  const isUploading = attachments.some((a) => a.status === 'uploading');

  return { attachments, addFiles, remove, removeAll, clear, uploadAll, isUploading };
}
