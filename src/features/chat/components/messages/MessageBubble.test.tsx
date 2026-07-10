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
});
