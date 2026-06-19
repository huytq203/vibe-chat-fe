import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/chat.api', () => ({
  chatApi: {
    getConversationKey: vi.fn(),
    getConversationKeys: vi.fn(),
  },
}));

// Mock importDek to avoid Web Crypto dependency in tests
vi.mock('./message-crypto', () => ({
  importDek: vi.fn((b64: string) => Promise.resolve({ type: 'secret', algorithm: { name: 'AES-GCM' }, _b64: b64 } as unknown as CryptoKey)),
}));

import { chatApi } from '@/services/chat.api';
import {
  getKeyForConversation,
  primeKeys,
  clearAll,
} from './conversation-key-store';

const makeDekResponse = (conversationId: string, keyB64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=') => ({
  conversationId,
  keyId: 'k1',
  keyVersion: 1,
  key: keyB64,
  alg: 'AES-256-GCM',
});

beforeEach(() => {
  clearAll();
  vi.clearAllMocks();
});

describe('getKeyForConversation', () => {
  it('nên gọi API 1 lần khi fetch cùng conversation 2 lần (cache hit)', async () => {
    vi.mocked(chatApi.getConversationKey).mockResolvedValue(makeDekResponse('c1'));

    await getKeyForConversation('c1');
    await getKeyForConversation('c1');

    expect(chatApi.getConversationKey).toHaveBeenCalledTimes(1);
    expect(chatApi.getConversationKey).toHaveBeenCalledWith('c1');
  });

  it('nên trả về CryptoKey từ API', async () => {
    vi.mocked(chatApi.getConversationKey).mockResolvedValue(makeDekResponse('c2'));

    const key = await getKeyForConversation('c2');

    expect(key).toBeDefined();
    expect((key as unknown as { _b64: string })._b64).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  });
});

describe('getKeyForConversation — de-dup concurrent calls', () => {
  it('nên gọi API chỉ 1 lần khi nhiều lời gọi đồng thời cho cùng conversation', async () => {
    vi.mocked(chatApi.getConversationKey).mockResolvedValue(makeDekResponse('c3'));

    // Gọi đồng thời 3 lần — chưa có cache
    const [k1, k2, k3] = await Promise.all([
      getKeyForConversation('c3'),
      getKeyForConversation('c3'),
      getKeyForConversation('c3'),
    ]);

    expect(chatApi.getConversationKey).toHaveBeenCalledTimes(1);
    // Tất cả trả về cùng 1 key instance
    expect(k1).toBe(k2);
    expect(k2).toBe(k3);
  });
});

describe('primeKeys', () => {
  it('nên chỉ request các id chưa có trong cache', async () => {
    // Warm 'c4' trước
    vi.mocked(chatApi.getConversationKey).mockResolvedValue(makeDekResponse('c4'));
    await getKeyForConversation('c4');
    vi.clearAllMocks();

    vi.mocked(chatApi.getConversationKeys).mockResolvedValue([makeDekResponse('c5'), makeDekResponse('c6')]);

    await primeKeys(['c4', 'c5', 'c6']);

    // c4 đã cache → chỉ request c5, c6
    expect(chatApi.getConversationKeys).toHaveBeenCalledTimes(1);
    expect(chatApi.getConversationKeys).toHaveBeenCalledWith(['c5', 'c6']);
  });

  it('nên không gọi API khi tất cả id đã được cache', async () => {
    vi.mocked(chatApi.getConversationKey).mockResolvedValue(makeDekResponse('c7'));
    await getKeyForConversation('c7');
    vi.clearAllMocks();

    await primeKeys(['c7']);

    expect(chatApi.getConversationKeys).not.toHaveBeenCalled();
  });

  it('nên cache các key từ batch response để getKeyForConversation không cần gọi API thêm', async () => {
    vi.mocked(chatApi.getConversationKeys).mockResolvedValue([makeDekResponse('c8')]);

    await primeKeys(['c8']);
    vi.clearAllMocks(); // reset sau khi primeKeys

    // getKeyForConversation nên dùng cache, không gọi API
    await getKeyForConversation('c8');
    expect(chatApi.getConversationKey).not.toHaveBeenCalled();
  });
});
