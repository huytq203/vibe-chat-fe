'use client';

import { useState, useCallback } from 'react';
import { mediaApi } from '@/services/media.api';

/** Category media cho ảnh hồ sơ. Cover dùng AVATAR (ảnh profile), file ≤10MB → upload trực tiếp. */
type ImageCategory = 'AVATAR' | 'THUMBNAIL';

export type UploadedImage = { id: string; url: string | null };

/**
 * Upload 1 ảnh (avatar / ảnh bìa) qua mediaApi → trả `id` (mediaId để PATCH /users/me)
 * và `url` ký sẵn (để preview). Wrap mediaApi (CLAUDE.md §7).
 */
export function useImageUpload(category: ImageCategory = 'AVATAR') {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedImage | null> => {
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn tệp ảnh');
        return null;
      }
      setUploading(true);
      setProgress(0);
      setError(null);
      try {
        const media = await mediaApi.uploadDirect(file, category, (p) => setProgress(p));
        return { id: media.id, url: media.downloadUrl };
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tải ảnh thất bại');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [category],
  );

  return { upload, uploading, progress, error };
}
