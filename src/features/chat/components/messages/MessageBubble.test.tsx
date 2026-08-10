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
  it('renders the original sender label for a forwarded message', () => {
    const { getByText } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          forwardFrom: {
            senderId: 'original-sender',
            displayName: 'Người gửi gốc',
            conversationId: null,
            originalSentAt: '2026-07-09T08:00:00.000Z',
          },
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    expect(getByText('Chuyển tiếp từ Người gửi gốc')).toBeInTheDocument();
  });

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

  it('keeps slash commands clickable inside a bot Markdown reply', () => {
    // Regression: nhánh Markdown chạy trước BotCommandText nên command trong tin
    // bot từng render thành chữ thường, không bấm được.
    const { getByRole } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          plaintext: '**Lệnh có sẵn**\n\n- /newbot — tạo bot mới\n- /mybots — danh sách bot',
        })}
        meId="me"
        showAvatar={false}
        renderMarkdown
        enableBotCommands
      />,
    );

    expect(getByRole('link', { name: /newbot/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /mybots/i })).toBeInTheDocument();
  });

  it('leaves slash-like text alone when the conversation has no bot', () => {
    const { queryByRole, container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({ plaintext: '**Ghi chú**\n\n- /newbot chỉ là chữ' })}
        meId="me"
        showAvatar={false}
        renderMarkdown
      />,
    );

    expect(queryByRole('link', { name: /newbot/i })).not.toBeInTheDocument();
    expect(container).toHaveTextContent('/newbot');
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
