'use client';
import { useEffect, useState } from 'react';
import { getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { decryptToString } from '@/lib/crypto/message-crypto';
import { isEncryptedMessage, peekDecrypted, rememberDecrypted } from '@/lib/crypto/decrypt-cache';
import type { Message } from '@/features/chat/types';

export type DecryptedBody = { text: string | null; loading: boolean; failed: boolean };

/**
 * Giải mã content của 1 message FE-encrypted để hiển thị.
 * - Tin không mã hoá (`encrypted` falsy) → trả thẳng `plaintext` (tương thích ngược + optimistic).
 * - Tin mã hoá → lấy DEK từ RAM key store, giải mã `ciphertext`; lỗi → `failed=true`.
 */
export function useDecryptedBody(message: Message): DecryptedBody {
  const isEncrypted = isEncryptedMessage(message);
  const cachedHit = isEncrypted ? peekDecrypted(message) : undefined;

  const [text, setText] = useState<string | null>(
    isEncrypted ? cachedHit ?? null : message.plaintext,
  );
  const [loading, setLoading] = useState<boolean>(isEncrypted && cachedHit === undefined);
  const [failed, setFailed] = useState(false);

  const cipherKey = `${message.id}:${message.ciphertext ?? ''}`;
  useEffect(() => {
    let cancelled = false;
    // setState đặt trong async IIFE để tránh cascading render (react-hooks/set-state-in-effect).
    void (async () => {
      if (!isEncrypted) {
        if (!cancelled) {
          setText(message.plaintext);
          setLoading(false);
          setFailed(false);
        }
        return;
      }
      const hit = peekDecrypted(message);
      if (hit !== undefined) {
        if (!cancelled) {
          setText(hit);
          setLoading(false);
          setFailed(false);
        }
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setFailed(false);
      }
      try {
        const key = await getKeyForConversation(message.conversationId);
        const plain = await decryptToString(
          { ciphertext: message.ciphertext!, iv: message.iv!, authTag: message.authTag! },
          key,
        );
        rememberDecrypted(message, plain);
        if (!cancelled) {
          setText(plain);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cipherKey, isEncrypted, message.conversationId, message.plaintext]);

  return { text, loading, failed };
}

/**
 * Giải mã sẵn 1 danh sách message FE-encrypted vào cache dùng chung (cho các view
 * không render bubble: banner ghim, danh sách tìm kiếm…). Trả về 1 counter tăng dần
 * sau mỗi lượt giải mã xong để buộc consumer (đọc cache đồng bộ qua getMessageSnippet)
 * render lại.
 */
export function useEnsureDecrypted(messages: Message[]): number {
  const [version, setVersion] = useState(0);

  const pending = messages.filter((m) => isEncryptedMessage(m) && peekDecrypted(m) === undefined);
  const depKey = pending.map((m) => `${m.id}:${m.ciphertext ?? ''}`).join('|');

  useEffect(() => {
    if (pending.length === 0) return;
    let cancelled = false;
    void (async () => {
      let changed = false;
      await Promise.all(
        pending.map(async (m) => {
          try {
            const key = await getKeyForConversation(m.conversationId);
            const plain = await decryptToString(
              { ciphertext: m.ciphertext!, iv: m.iv!, authTag: m.authTag! },
              key,
            );
            rememberDecrypted(m, plain);
            changed = true;
          } catch {
            // Bỏ qua tin lỗi giải mã — snippet sẽ fallback placeholder.
          }
        }),
      );
      if (changed && !cancelled) setVersion((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return version;
}
