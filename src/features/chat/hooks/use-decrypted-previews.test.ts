import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock crypto layer — test chỉ quan tâm hook điều phối prime + decrypt, không chạy Web Crypto.
vi.mock('@/lib/crypto/conversation-key-store', () => ({
  primeKeys: vi.fn(() => Promise.resolve()),
  getKeyForConversation: vi.fn(() =>
    Promise.resolve({ type: 'secret' } as unknown as CryptoKey),
  ),
}));
vi.mock('@/lib/crypto/message-crypto', () => ({
  decryptToString: vi.fn(),
}));

import { primeKeys, getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { decryptToString } from '@/lib/crypto/message-crypto';
import { useDecryptedPreviews } from './use-decrypted-previews';
import type { Conversation, LastMessagePreview } from '@/features/chat/types';

const mockPrime = vi.mocked(primeKeys);
const mockGetKey = vi.mocked(getKeyForConversation);
const mockDecrypt = vi.mocked(decryptToString);

// Conversation builder tối thiểu — chỉ giữ field hook đụng tới (id + lastMessage).
function makeConv(id: string, lastMessage: LastMessagePreview | null): Conversation {
  return { id, lastMessage } as unknown as Conversation;
}

function encryptedLast(): LastMessagePreview {
  return {
    id: 'm1',
    senderId: 'u1',
    type: 'TEXT',
    preview: null,
    previewEncrypted: true,
    previewCipher: { ciphertext: 'CT', iv: 'IV', authTag: 'TAG' },
    keyId: 'k1',
    keyVersion: 1,
    createdAt: '2026-06-19T00:00:00.000Z',
  } as unknown as LastMessagePreview;
}

function plainLast(): LastMessagePreview {
  return {
    id: 'm2',
    senderId: 'u1',
    type: 'TEXT',
    preview: 'xin chào',
    previewEncrypted: false,
    previewCipher: null,
    keyId: null,
    keyVersion: null,
    createdAt: '2026-06-19T00:00:00.000Z',
  } as unknown as LastMessagePreview;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDecryptedPreviews', () => {
  it('nên prime key + giải mã preview cho hội thoại FE-encrypted', async () => {
    mockDecrypt.mockResolvedValue('tin mật đã giải mã');
    const convs = [makeConv('c1', encryptedLast())];

    const { result } = renderHook(() => useDecryptedPreviews(convs));

    await waitFor(() => expect(result.current.get('c1')).toBe('tin mật đã giải mã'));
    expect(mockPrime).toHaveBeenCalledWith(['c1']);
    expect(mockGetKey).toHaveBeenCalledWith('c1');
    expect(mockDecrypt).toHaveBeenCalledWith(
      { ciphertext: 'CT', iv: 'IV', authTag: 'TAG' },
      expect.anything(),
    );
  });

  it('nên KHÔNG gọi crypto cho hội thoại preview plaintext', async () => {
    const convs = [makeConv('c2', plainLast())];

    const { result } = renderHook(() => useDecryptedPreviews(convs));

    // Chờ 1 microtask để chắc chắn effect không kích hoạt crypto.
    await waitFor(() => expect(mockPrime).not.toHaveBeenCalled());
    expect(mockDecrypt).not.toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });

  it('nên bỏ qua hội thoại khi giải mã lỗi (fallback an toàn)', async () => {
    mockDecrypt.mockRejectedValue(new Error('mất key'));
    const convs = [makeConv('c3', encryptedLast())];

    const { result } = renderHook(() => useDecryptedPreviews(convs));

    await waitFor(() => expect(mockDecrypt).toHaveBeenCalled());
    expect(result.current.has('c3')).toBe(false);
  });
});
