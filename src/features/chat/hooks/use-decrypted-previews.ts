'use client';
import { useEffect, useState } from 'react';
import { primeKeys, getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { decryptToString } from '@/lib/crypto/message-crypto';
import type { Conversation } from '@/features/chat/types';

// Trả Map<conversationId, previewText đã giải mã> cho các hội thoại có preview mã hoá.
export function useDecryptedPreviews(conversations: Conversation[]): Map<string, string> {
  const [decrypted, setDecrypted] = useState<Map<string, string>>(new Map());

  // Khoá phụ thuộc: chỉ chạy lại khi tập (id + ciphertext) đổi — tránh vòng lặp.
  const encrypted = conversations.filter(
    (c) => c.lastMessage?.previewEncrypted && c.lastMessage.previewCipher,
  );
  const depKey = encrypted
    .map((c) => `${c.id}:${c.lastMessage?.previewCipher?.ciphertext ?? ''}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Không còn preview mã hoá → dọn map (đặt setState trong async để tránh
      // cascading render cảnh báo bởi eslint — không set đồng bộ trong thân effect).
      if (encrypted.length === 0) {
        if (!cancelled) setDecrypted((prev) => (prev.size === 0 ? prev : new Map()));
        return;
      }
      await primeKeys(encrypted.map((c) => c.id));
      const next = new Map<string, string>();
      await Promise.all(
        encrypted.map(async (c) => {
          try {
            const key = await getKeyForConversation(c.id);
            next.set(c.id, await decryptToString(c.lastMessage!.previewCipher!, key));
          } catch {
            // Giải mã lỗi (mất key/đổi version) → để trống, UI fallback placeholder.
          }
        }),
      );
      if (!cancelled) setDecrypted(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return decrypted;
}
