import { describe, expect, it } from 'vitest';
import type { Conversation, ConversationMember } from '@/features/chat/types';
import { getPendingBotTypingTargets } from './use-message-send-mutations';

function member(overrides: Partial<ConversationMember>): ConversationMember {
  return {
    userId: 'user-1',
    username: 'user',
    displayName: 'User',
    avatarUrl: null,
    nickname: null,
    role: 'MEMBER',
    isBot: false,
    ...overrides,
  };
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'GROUP',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'me',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 0,
    memberIds: ['me', 'bot-1'],
    members: [
      member({ userId: 'me', username: 'me', displayName: 'Me' }),
      member({
        userId: 'bot-1',
        username: 'bot_service_logs',
        displayName: 'Bot Service Logs',
        isBot: true,
      }),
    ],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('getPendingBotTypingTargets', () => {
  it('bật pending typing cho bot trong direct bot chat', () => {
    expect(
      getPendingBotTypingTargets(
        conversation({ type: 'DIRECT' }),
        { conversationId: 'conv-1', plaintext: 'hệ thống ổn không?' },
        'me',
      ),
    ).toEqual(['bot-1']);
  });

  it('bật pending typing cho bot được mention trong group', () => {
    expect(
      getPendingBotTypingTargets(
        conversation(),
        {
          conversationId: 'conv-1',
          plaintext: '@Bot Service Logs kiểm tra log',
          mentions: [{ userId: 'bot-1', startOffset: 0, length: 17 }],
        },
        'me',
      ),
    ).toEqual(['bot-1']);
  });

  it('không bật pending typing cho group message không mention bot', () => {
    expect(
      getPendingBotTypingTargets(
        conversation(),
        { conversationId: 'conv-1', plaintext: 'mọi người xem giúp' },
        'me',
      ),
    ).toEqual([]);
  });
});
