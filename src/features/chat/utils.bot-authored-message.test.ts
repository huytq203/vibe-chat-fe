import { describe, expect, it } from 'vitest';
import { isBotAuthoredMessage } from './utils';
import type { Conversation, ConversationMember, Message } from './types';

function buildMember(overrides: Partial<ConversationMember> = {}): ConversationMember {
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

function buildConversation(
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'user-1',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 1,
    memberIds: ['user-1', 'bot-1'],
    members: [
      buildMember({ userId: 'user-1', username: 'huy' }),
      buildMember({
        userId: 'bot-1',
        username: 'halo_bot',
        displayName: 'Halo Bot',
        isBot: true,
      }),
    ],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'bot-1',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: '**Tóm tắt nội dung:**',
    attachments: [],
    contentPreview: '**Tóm tắt nội dung:**',
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('isBotAuthoredMessage', () => {
  it('nhận diện bot khi senderId trùng member bot', () => {
    expect(
      isBotAuthoredMessage(buildMessage(), buildConversation(), 'user-1'),
    ).toBe(true);
  });

  it('vẫn render markdown trong DIRECT bot chat khi senderId lệch runtime id', () => {
    expect(
      isBotAuthoredMessage(
        buildMessage({ senderId: 'bot-keycloak-runtime-id' }),
        buildConversation(),
        'user-1',
      ),
    ).toBe(true);
  });

  it('vẫn nhận diện DIRECT bot chat khi meId chưa hydrate và senderId runtime lệch', () => {
    expect(
      isBotAuthoredMessage(
        buildMessage({ senderId: 'bot-keycloak-runtime-id' }),
        buildConversation(),
        null,
      ),
    ).toBe(true);
  });

  it('không bật markdown cho tin human khi meId chưa hydrate', () => {
    expect(
      isBotAuthoredMessage(
        buildMessage({ senderId: 'user-1', plaintext: '**raw**' }),
        buildConversation(),
        null,
      ),
    ).toBe(false);
  });

  it('không render markdown cho người khác trong group dù group có bot member', () => {
    expect(
      isBotAuthoredMessage(
        buildMessage({ senderId: 'member-2', plaintext: '**raw**' }),
        buildConversation({
          type: 'GROUP',
          memberCount: 3,
          memberIds: ['user-1', 'member-2', 'bot-1'],
          members: [
            buildMember({ userId: 'user-1', username: 'huy' }),
            buildMember({ userId: 'member-2', username: 'friend' }),
            buildMember({
              userId: 'bot-1',
              username: 'halo_bot',
              displayName: 'Halo Bot',
              isBot: true,
            }),
          ],
        }),
        'user-1',
      ),
    ).toBe(false);
  });

  it('không render markdown cho tin của chính mình', () => {
    expect(
      isBotAuthoredMessage(
        buildMessage({ senderId: 'user-1', metadata: { bot: {} } }),
        buildConversation(),
        'user-1',
      ),
    ).toBe(false);
  });
});
