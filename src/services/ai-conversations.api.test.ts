import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { ...actual.apiClient, get } };
});

import { aiConversationsApi } from './ai-conversations.api';

describe('API lịch sử hội thoại AI hợp nhất', () => {
  beforeEach(() => get.mockReset());

  it('map role của máy chủ sang role của ứng dụng', async () => {
    get.mockResolvedValue({
      id: 'conversation-1',
      title: 'Tiến độ dự án',
      origin: 'TASKS',
      context: { projectId: 'project-1' },
      messages: [
        {
          id: 'message-1', role: 'USER', content: 'Tiến độ?', status: null,
          toolNames: null, attachments: null, createdAt: '2026-09-12T08:00:00.000Z',
        },
        {
          id: 'message-2', role: 'ASSISTANT', content: 'Đang đúng hạn', status: null,
          toolNames: ['project_stats'], attachments: null,
          createdAt: '2026-09-12T08:00:01.000Z',
        },
      ],
    });

    const detail = await aiConversationsApi.detail('conversation-1');

    expect(detail.messages.map(({ role }) => role)).toEqual(['user', 'assistant']);
  });

  it('nên giữ downloadUrl của tệp đính kèm khi đọc chi tiết', async () => {
    get.mockResolvedValue({
      id: 'conversation-1', title: 'Ảnh tham khảo', origin: 'CHAT', context: null,
      messages: [{
        id: 'message-1', role: 'USER', content: 'Xem ảnh này', status: null,
        toolNames: null,
        attachments: [{
          name: 'minh-hoa.png', mimeType: 'image/png', size: 2048,
          downloadUrl: 'https://storage.test/minh-hoa.png',
        }],
        createdAt: '2026-09-12T08:00:00.000Z',
      }],
    });

    const detail = await aiConversationsApi.detail('conversation-1');

    expect(detail.messages[0]?.attachments?.[0]?.downloadUrl)
      .toBe('https://storage.test/minh-hoa.png');
  });
});
