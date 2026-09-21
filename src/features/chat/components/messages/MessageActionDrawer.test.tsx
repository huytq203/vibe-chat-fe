import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { MessageActionDrawer } from './MessageActionDrawer';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

vi.mock('@/features/chat/hooks/useForwardMessage', () => ({
  useForwardMessage: () => ({ forward: vi.fn() }),
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

describe('MessageActionDrawer', () => {
  it('nên gọi enter với đúng conversationId/messageId khi bấm Chọn nhiều tin nhắn', async () => {
    const user = userEvent.setup();
    const message = buildMessage();
    renderWithProviders(
      <MessageActionDrawer
        message={message}
        meId="user-1"
        isMe={false}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(await screen.findByText('Chọn nhiều tin nhắn'));

    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBe('conv-1');
    expect(state.selectedIds.has('msg-1')).toBe(true);
  });
});
