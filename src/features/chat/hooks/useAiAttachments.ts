'use client';

import { useCallback, useState } from 'react';
import type { AiAttachment } from '@/lib/gemini';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
]);
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_COUNT = 3;

function encodeFile(file: File): Promise<AiAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] ?? '';
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        size: file.size,
        base64Data,
        previewUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Lỗi đọc file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function useAiAttachments() {
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(async (files: FileList | File[]): Promise<void> => {
    const arr = Array.from(files);
    setError(null);

    for (const file of arr) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError(`Định dạng không hỗ trợ: ${file.name}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`${file.name} vượt quá 5 MB`);
        return;
      }
    }

    try {
      const encoded = await Promise.all(arr.map(encodeFile));
      setAttachments((prev) => {
        if (prev.length + encoded.length > MAX_COUNT) {
          setError('Tối đa 3 file mỗi lần gửi');
          encoded.forEach((a) => {
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          });
          return prev;
        }
        return [...prev, ...encoded];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đọc file');
    }
  }, []);

  const removeAttachment = useCallback((id: string): void => {
    setAttachments((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove?.previewUrl) URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback((): void => {
    setAttachments([]);
    setError(null);
  }, []);

  return { attachments, error, addFiles, removeAttachment, clearAttachments };
}
