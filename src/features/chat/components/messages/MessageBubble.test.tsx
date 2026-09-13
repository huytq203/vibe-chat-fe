import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, renderWithProviders } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { CHAT_THEMES } from '@/features/chat/config/chat-themes';
import { MessageBubble } from './MessageBubble';
import { LightboxProvider } from './LightboxProvider';

// Dialog mở profile cần next/navigation router context không có trong test — mock như RichText.test.tsx.
vi.mock('@/features/chat/components/contact/UserProfileDialog', () => ({
  UserProfileDialog: () => null,
}));

vi.mock('@/features/chat/hooks/use-mutations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat/hooks/use-mutations')>();
  return {
    ...actual,
    useOpenDirectConversation: () => ({ mutate: vi.fn() }),
  };
});

vi.mock('@/components/common/ImageLightbox', () => ({
  ImageLightbox: ({ open, slides }: { open: boolean; slides: unknown[] }) =>
    open ? <div role="dialog">{slides.length} ảnh</div> : null,
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

function buildImageAttachment(id: string) {
  return {
    mediaId: id,
    fileName: `${id}.png`,
    fileSize: 1024,
    mimeType: 'image/png',
    width: 800,
    height: 800,
    duration: null,
    downloadUrl: `https://example.com/${id}.png`,
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
    const surface = container.querySelector('[data-message-surface]') as HTMLElement;
    const meta = container.querySelector('[data-message-meta]') as HTMLElement;
    expect(surface).not.toContainElement(meta);
    expect(surface).toHaveClass('text-primary-foreground');
  });

  it('uses uniform rounded-2xl corners for the other person message (no tail cut)', () => {
    const { container } = renderWithProviders(
      <MessageBubble message={buildMessage({ senderId: 'other' })} meId="me" showAvatar={false} />,
    );
    const bubble = container.querySelector('.rounded-2xl') as HTMLElement;
    expect(bubble).toHaveClass('rounded-2xl', 'border', 'border-border');
    expect(bubble.className).not.toMatch(/rounded-bl-md/);
  });

  it('keeps my bubble primary even when a chat theme is selected', () => {
    const goldTheme = CHAT_THEMES.find((theme) => theme.key === 'gold');
    expect(goldTheme).toBeDefined();
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({ senderId: 'me' })}
        meId="me"
        showAvatar={false}
        bubbleConfig={goldTheme!.bubbleConfig}
      />,
    );

    const surface = container.querySelector('[data-message-surface]') as HTMLElement;
    expect(surface).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(surface).not.toHaveAttribute('style');
  });

  it('preserves an explicit rich-text color on an outgoing bubble', () => {
    const { container, getByText } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          plaintext: 'Nội dung',
          metadata: {
            richText: {
              v: 1,
              marks: [{ start: 0, end: 8, type: 'color', value: 'danger' }],
              blocks: [],
            },
          },
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    expect(getByText('Nội dung')).toBeInTheDocument();
    expect(container.querySelector('[style*="color"]')).toHaveStyle({
      color: 'var(--color-danger)',
    });
  });

  it('preserves an explicit rich-text color on an incoming bubble', () => {
    const { container, getByText } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'other',
          plaintext: 'Tin đối tác',
          metadata: {
            richText: {
              v: 1,
              marks: [{ start: 0, end: 11, type: 'color', value: 'blue' }],
              blocks: [],
            },
          },
        })}
        meId="me"
        showAvatar={false}
        wallpaperActive
      />,
    );

    expect(getByText('Tin đối tác')).toBeInTheDocument();
    expect(container.querySelector('[style*="color"]')).toHaveStyle({
      color: 'var(--color-info)',
    });
  });

  it('makes muted rich text inherit the bubble color at lower emphasis', () => {
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          plaintext: 'Tin dịu',
          metadata: {
            richText: {
              v: 1,
              marks: [{ start: 0, end: 7, type: 'color', value: 'muted' }],
              blocks: [],
            },
          },
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    const muted = container.querySelector('[style*="opacity"]') as HTMLElement;
    expect(muted.style.color).toBe('');
    expect(muted).toHaveStyle({ opacity: '0.72' });
  });

  it('places store message time and status outside the content surface', () => {
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({ senderId: 'me', isView: true })}
        meId="me"
        showAvatar={false}
        appearance="store"
      />,
    );

    const surface = container.querySelector('[data-message-surface]') as HTMLElement;
    const meta = container.querySelector('[data-message-meta]') as HTMLElement;
    expect(surface).not.toContainElement(meta);
    expect(surface).toHaveClass('bg-primary', 'text-primary-foreground', 'shadow-micro');
    expect(meta).toHaveClass('text-primary-foreground');
  });

  it('renders multiple store images as one gallery without a blue bubble', () => {
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          type: 'IMAGE',
          plaintext: null,
          contentPreview: null,
          attachments: [
            buildImageAttachment('image-1'),
            buildImageAttachment('image-2'),
            buildImageAttachment('image-3'),
          ],
        })}
        meId="me"
        showAvatar={false}
        appearance="store"
      />,
    );

    const surface = container.querySelector('[data-message-surface]') as HTMLElement;
    const gallery = container.querySelector('[data-media-gallery="store"]') as HTMLElement;
    expect(surface).not.toHaveClass('bg-primary');
    expect(gallery).toBeInTheDocument();
    expect(gallery.querySelectorAll('img')).toHaveLength(3);
    expect(gallery.querySelector('.row-span-2')).toBeInTheDocument();
  });

  it('renders three chat images as a rounded mosaic without an empty primary cell', () => {
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          type: 'IMAGE',
          plaintext: null,
          contentPreview: null,
          attachments: [
            buildImageAttachment('chat-image-1'),
            buildImageAttachment('chat-image-2'),
            buildImageAttachment('chat-image-3'),
          ],
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    const surface = container.querySelector('[data-message-surface]') as HTMLElement;
    const gallery = container.querySelector('[data-media-gallery="default"]') as HTMLElement;
    expect(surface).toHaveClass('bg-transparent', 'p-0');
    expect(surface).not.toHaveClass('bg-primary');
    expect(gallery).toHaveClass('overflow-hidden', 'rounded-2xl', 'shadow-micro');
    expect(gallery.querySelectorAll('img')).toHaveLength(3);
    expect(gallery.querySelector('.row-span-2')).toBeInTheDocument();
  });

  it('opens store images in the shared chat lightbox', async () => {
    const user = userEvent.setup();
    const { findByRole, getByRole } = renderWithProviders(
      <LightboxProvider>
        <MessageBubble
          message={buildMessage({
            senderId: 'me',
            type: 'IMAGE',
            plaintext: null,
            contentPreview: null,
            attachments: [buildImageAttachment('image-lightbox')],
          })}
          meId="me"
          showAvatar={false}
          appearance="store"
        />
      </LightboxProvider>,
    );

    await user.click(getByRole('button', { name: 'Phóng to ảnh' }));
    expect(await findByRole('dialog')).toHaveTextContent('1 ảnh');
  });

  it('lazy-loads media behind a placeholder and reveals it only after load', () => {
    const { container, getByAltText } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          type: 'IMAGE',
          plaintext: null,
          contentPreview: null,
          attachments: [buildImageAttachment('image-lazy')],
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    const image = getByAltText('image-lazy.png');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('width', '800');
    expect(image).toHaveAttribute('height', '800');
    expect(image).toHaveClass('opacity-0');
    expect(container.querySelector('[data-image-loading]')).toBeInTheDocument();

    fireEvent.load(image);

    expect(image).toHaveClass('opacity-100');
    expect(container.querySelector('[data-image-loading]')).not.toBeInTheDocument();
  });

  it('gives contact cards a larger responsive wrapper without fixed-width overflow', () => {
    const { container } = renderWithProviders(
      <MessageBubble
        message={buildMessage({
          senderId: 'me',
          type: 'CONTACT',
          metadata: {
            contact: {
              contactUserId: 'contact-1',
              displayName: 'Trần Quang Huy',
              username: 'huytq',
              avatarUrl: null,
            },
          },
        })}
        meId="me"
        showAvatar={false}
      />,
    );

    const card = container.querySelector('[data-contact-card]') as HTMLElement;
    const wrapper = card.parentElement?.parentElement as HTMLElement;

    expect(card).toHaveClass('w-full');
    expect(card).not.toHaveClass('w-[270px]');
    expect(wrapper).toHaveClass('min-w-0', 'w-[352px]', 'max-w-[92%]');
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
