'use client';
import { useEffect, useState } from 'react';
import { primeKeys, getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { decryptToString } from '@/lib/crypto/message-crypto';
import type { Conversation } from '@/features/chat/types';

// Cache module-level: tồn tại suốt session, không reset khi component unmount/remount.
// Giải quyết flash "Đang giải mã…" khi ConversationList remount (chuyển tab, Next.js navigation).
const _moduleCache = new Map<string, string>();

// Trả Map<conversationId, previewText đã giải mã> cho các hội thoại có preview mã hoá.
// Kết hợp module-level cache (chống flash khi remount) + merge strategy (chống flash khi re-decrypt).
export function useDecryptedPreviews(conversations: Conversation[]): Map<string, string> {
  // Khởi từ module cache → không flash ngay cả lần mount đầu sau khi đã từng decrypt
  const [decrypted, setDecrypted] = useState<Map<string, string>>(() => new Map(_moduleCache));

  const encrypted = conversations.filter(
    (c) => c.lastMessage?.previewEncrypted && c.lastMessage.previewCipher,
  );
  const depKey = encrypted
    .map((c) => `${c.id}:${c.lastMessage?.previewCipher?.ciphertext ?? ''}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (encrypted.length === 0) {
        if (!cancelled) {
          _moduleCache.clear();
          setDecrypted((prev) => (prev.size === 0 ? prev : new Map()));
        }
        return;
      }
      await primeKeys(encrypted.map((c) => c.id));
      const updates = new Map<string, string>();
      await Promise.all(
        encrypted.map(async (c) => {
          try {
            const key = await getKeyForConversation(c.id);
            updates.set(c.id, await decryptToString(c.lastMessage!.previewCipher!, key));
          } catch {
            // Giải mã lỗi → giữ nguyên giá trị cũ nếu có
          }
        }),
      );
      if (!cancelled) {
        setDecrypted((prev) => {
          const encryptedIds = new Set(encrypted.map((c) => c.id));
          const next = new Map(prev);
          // Merge kết quả mới — không xoá giá trị cũ cho đến khi có kết quả mới
          updates.forEach((v, k) => {
            next.set(k, v);
            _moduleCache.set(k, v);
          });
          // Dọn các conversation không còn dùng mã hoá nữa
          prev.forEach((_, k) => {
            if (!encryptedIds.has(k)) {
              next.delete(k);
              _moduleCache.delete(k);
            }
          });
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return decrypted;
}
