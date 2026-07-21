import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { MessageBubble } from './MessageBubble';

// Dialog mở profile cần next/navigation router context không có trong test — mock như RichText.test.tsx.
vi.mock('@/features/chat/components/contact/UserProfileDialog', () => ({
  UserProfileDialog: () => null,
}));

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: 'Hi',
    attachments: [],
    contentPreview: 'Hi',
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: new Date('2026-07-10T08:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('MessageBubble', () => {
  it('uses uniform rounded-2xl corners for my own message (no tail cut)', () => {
    const { container } = renderWithProviders(
      <MessageBubble message={buildMessage({ senderId: 'me' })} meId="me" showAvatar={false} />,
    );
    const bubble = container.querySelector('.rounded-2xl') as HTMLElement;
    expect(bubble).toHaveClass('rounded-2xl');
    expect(bubble.className).not.toMatch(/rounded-br-md/);
    expect(bubble.className).not.toMatch(/rounded-bl-md/);
  });

  it('uses uniform rounded-2xl corners for the other person message (no tail cut)', () => {
    const { container } = renderWithProviders(
      <MessageBubble message={buildMessage({ senderId: 'other' })} meId="me" showAvatar={false} />,
    );
    const bubble = container.querySelector('.rounded-2xl') as HTMLElement;
    expect(bubble).toHaveClass('rounded-2xl', 'border', 'border-border');
    expect(bubble.className).not.toMatch(/rounded-bl-md/);
  });

  it('renders Markdown only when the sender is marked as a bot', () => {
    const message = buildMessage({ plaintext: '**Xin chào**' });
    const { container, rerender } = renderWithProviders(
      <MessageBubble
        message={message}
        meId="me"
        showAvatar={false}
        renderMarkdown
      />,
    );
    expect(container.querySelector('strong')).toHaveTextContent('Xin chào');

    rerender(
      <MessageBubble message={message} meId="me" showAvatar={false} />,
    );
    expect(container.querySelector('strong')).toBeNull();
    expect(container).toHaveTextContent('**Xin chào**');
  });

  it('renders assistant-style Markdown fallback for incoming bot/log summaries', () => {
    const message = buildMessage({
      senderId: 'bot-runtime-id',
      plaintext: [
        'Mình vừa kiểm tra **30 log gần nhất** của bot-service.',
        '',
        '**Chi tiết:**',
        '- **29 dòng:** `info` — health check chạy ổn',
        '- **1 dòng:** `warn` — token sai',
        '',
        '**Kết luận:** hệ thống ổn.',
      ].join('\n'),
    });

    const { container } = renderWithProviders(
      <MessageBubble message={message} meId="me" showAvatar={false} />,
    );

    expect(container.querySelectorAll('strong').length).toBeGreaterThan(0);
    expect(container.querySelector('code')).toHaveTextContent('info');
    expect(container.querySelector('ul')).toHaveTextContent('health check');
  });

  it('renders assistant Markdown before mention metadata in group bot replies', () => {
    const message = buildMessage({
      senderId: 'bot-runtime-id',
      plaintext: [
        'Dưới đây là 10 dòng log gần nhất của **Bot Service**:',
        '',
        '| Thời gian | Mức | Nội dung |',
        '|---|---|---|',
        '| 1784652998881 | ERROR | `GET /api/v1/bot/me` → **401** |',
        '',
        '**Phát hiện:**',
        '- Có **1 lỗi 401** ở đầu log.',
      ].join('\n'),
      mentions: [{ userId: 'bot-runtime-id', startOffset: 0, length: 4 }],
    });

    const { container } = renderWithProviders(
      <MessageBubble message={message} meId="me" showAvatar={false} />,
    );

    expect(container.querySelector('table')).toHaveTextContent('Thời gian');
    expect(container.querySelector('strong')).toHaveTextContent('Bot Service');
    expect(container.querySelector('code')).toHaveTextContent('GET /api/v1/bot/me');
  });
});
