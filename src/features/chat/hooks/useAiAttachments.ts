'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAttachment } from '@/lib/gemini';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
]);
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_COUNT = 3;

interface UseAiAttachmentsReturn {
  attachments: AiAttachment[];
  error: string | null;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
}

function encodeFile(file: File): Promise<AiAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error(`Lỗi đọc file: ${file.name}`));
        return;
      }
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

export function useAiAttachments(): UseAiAttachmentsReturn {
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []);

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
      // Capture count trước khi updater chạy — addFiles là async nên render đã settle
      const currentCount = attachments.length;
      if (currentCount + encoded.length > MAX_COUNT) {
        encoded.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        });
        setError('Tối đa 3 file mỗi lần gửi');
        return;
      }
      setAttachments((prev) => [...prev, ...encoded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đọc file');
    }
  }, [attachments.length]);

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
