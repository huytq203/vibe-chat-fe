'use client';
import { useEffect, useState } from 'react';
import { getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { decryptJson } from '@/lib/crypto/message-crypto';
import type { EncryptedMetadataBlob } from '@/features/my-store/types';

type State<T> = { data: T | null; loading: boolean; failed: boolean };

/**
 * Giải mã `metadata.encrypted` của 1 note myStore (reminder/checklist/bookmark) thành
 * object chữ nhạy cảm. Note plaintext (back-compat, không có `encrypted`) → trả null,
 * loading=false để card dùng field plaintext sẵn có.
 */
export function useDecryptedMetadata<T>(
  conversationId: string,
  metadata: Record<string, unknown> | null,
): State<T> {
  const enc = (metadata?.encrypted ?? null) as EncryptedMetadataBlob | null;
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: !!enc,
    failed: false,
  });

  const depKey = enc ? `${conversationId}:${enc.ciphertext}` : '';
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!enc) {
        if (!cancelled) setState({ data: null, loading: false, failed: false });
        return;
      }
      if (!cancelled) setState({ data: null, loading: true, failed: false });
      try {
        const key = await getKeyForConversation(conversationId);
        const obj = await decryptJson<T>(enc, key);
        if (!cancelled) setState({ data: obj, loading: false, failed: false });
      } catch {
        if (!cancelled) setState({ data: null, loading: false, failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, conversationId]);

  return state;
}
