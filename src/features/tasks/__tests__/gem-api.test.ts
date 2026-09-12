import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ apiClient: client }));

import { aiApi } from '@/services/ai.api';

describe('API chấm gem bằng AI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi đúng endpoint AI với tiêu đề và mô tả', async () => {
    client.post.mockResolvedValue({ gem: 42, reason: 'Khối lượng ở mức vừa.' });

    await aiApi.estimateGem({ title: 'Chuẩn bị bản phát hành', description: 'Kiểm tra toàn bộ luồng.' });

    expect(client.post).toHaveBeenCalledWith('/api/v1/ai/tasks/estimate-gem', {
      body: {
        title: 'Chuẩn bị bản phát hành',
        description: 'Kiểm tra toàn bộ luồng.',
      },
      service: 'ai',
    });
  });
});
