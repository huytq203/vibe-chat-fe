import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/client', () => ({ apiClient: { get } }));

import { messageApi } from './chat-message.api';

describe('messageApi.resolveByIds', () => {
  beforeEach(() => get.mockReset());

  it('gửi danh sách UUID và trả về message đã resolve', async () => {
    const resolved = [{
      uuid: '22222222-2222-4222-8222-222222222222',
      senderId: 'user-1',
      previewText: 'Chốt giao diện thanh toán',
      createdAt: '2026-09-21T08:00:00.000Z',
    }];
    get.mockResolvedValue(resolved);

    await expect(messageApi.resolveByIds(
      '11111111-1111-4111-8111-111111111111',
      [resolved[0].uuid],
    )).resolves.toEqual(resolved);

    expect(get).toHaveBeenCalledWith(
      '/api/v1/conversations/11111111-1111-4111-8111-111111111111/messages/by-ids',
      { query: { uuids: resolved[0].uuid } },
    );
  });

  it('từ chối response sai contract', async () => {
    get.mockResolvedValue([{ uuid: 'not-a-uuid' }]);

    await expect(messageApi.resolveByIds(
      '11111111-1111-4111-8111-111111111111',
      ['22222222-2222-4222-8222-222222222222'],
    )).rejects.toThrow();
  });
});
