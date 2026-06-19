import type { Message } from '@/features/chat/types';

// Cache plaintext đã giải mã (RAM, theo phiên). Key = `${messageId}:${ciphertext}` để
// bất biến với cùng nội dung. Cho phép consumer đồng bộ (snippet/quote/copy) đọc lại
// kết quả mà BubbleContent đã giải mã, tránh giải mã trùng lặp.
const cache = new Map<string, string>();

function keyOf(message: Pick<Message, 'id' | 'ciphertext'>): string {
  return `${message.id}:${message.ciphertext ?? ''}`;
}

/** true nếu tin là FE-encrypted (có đủ ciphertext/iv/authTag). */
export function isEncryptedMessage(
  message: Pick<Message, 'encrypted' | 'ciphertext' | 'iv' | 'authTag'>,
): boolean {
  return !!(message.encrypted && message.ciphertext && message.iv && message.authTag);
}

/** Lưu plaintext đã giải mã vào cache. */
export function rememberDecrypted(
  message: Pick<Message, 'id' | 'ciphertext'>,
  plaintext: string,
): void {
  cache.set(keyOf(message), plaintext);
}

/** Đọc plaintext đã giải mã (nếu đã có trong cache) — đồng bộ, không giải mã mới. */
export function peekDecrypted(
  message: Pick<Message, 'id' | 'ciphertext'>,
): string | undefined {
  return cache.get(keyOf(message));
}

/** Xoá toàn bộ cache (ví dụ khi logout). */
export function clearDecryptedCache(): void {
  cache.clear();
}
