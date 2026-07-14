import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Conversation } from '@/features/chat/types';
import { useStrangerConversations } from './useStrangerConversations';

vi.mock('@/features/friends/hooks/use-query', () => ({
  useFriends: () => ({ data: { items: [] } }),
}));

const CONV_ID = 'conv-1';

function makeConversation(
  meId: string,
  otherId: string,
  lastSenderId: string,
  options: { otherIsBot?: boolean } = {},
): Conversation {
  return {
    id: CONV_ID,
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: meId,
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 1,
    memberIds: [meId, otherId],
    members: [
      {
        userId: meId,
        username: 'me',
        displayName: 'Me',
        avatarUrl: null,
        nickname: null,
        role: 'MEMBER',
        isBot: false,
      },
      {
        userId: otherId,
        username: options.otherIsBot ? 'weather_bot' : 'stranger',
        displayName: options.otherIsBot ? 'Weather Bot' : 'Stranger',
        avatarUrl: null,
        nickname: null,
        role: 'MEMBER',
        isBot: false,
      },
    ],
    lastMessage: {
      id: 'msg-1',
      senderId: lastSenderId,
      type: 'TEXT',
      preview: 'hi',
      createdAt: '2026-07-12T00:00:00.000Z',
    },
    lastMessageAt: '2026-07-12T00:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-07-12T00:00:00.000Z',
  };
}

describe('useStrangerConversations', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('coi là người lạ khi tin nhắn đầu tiên do người kia gửi', () => {
    const meId = 'me-case-1';
    const conv = makeConversation(meId, 'stranger-1', 'stranger-1');
    const { result } = renderHook(() => useStrangerConversations([conv], meId));

    expect(result.current.isStranger(conv)).toBe(true);
    expect(result.current.strangerConversations).toEqual([conv]);
  });

  it('không còn là người lạ ngay sau khi mình reply', () => {
    const meId = 'me-case-2';
    const conv = makeConversation(meId, 'stranger-2', meId);
    const { result } = renderHook(() => useStrangerConversations([conv], meId));

    expect(result.current.isStranger(conv)).toBe(false);
  });

  it('không đưa hội thoại với bot vào tin nhắn người lạ', () => {
    const meId = 'me-case-bot';
    const botId = 'bot-1';
    const conv = makeConversation(meId, botId, botId, { otherIsBot: true });
    const { result } = renderHook(() => useStrangerConversations([conv], meId));

    expect(result.current.isStranger(conv)).toBe(false);
    expect(result.current.strangerConversations).toEqual([]);
  });

  it('vẫn KHÔNG quay lại người lạ khi người kia nhắn tiếp sau khi mình đã reply (sticky)', () => {
    const meId = 'me-case-3';
    const strangerId = 'stranger-3';
    const replied = makeConversation(meId, strangerId, meId);
    const { result, rerender } = renderHook(
      ({ conversations }: { conversations: Conversation[] }) =>
        useStrangerConversations(conversations, meId),
      { initialProps: { conversations: [replied] } },
    );

    // Mình đã reply → hội thoại thoát khỏi danh sách người lạ.
    expect(result.current.isStranger(replied)).toBe(false);

    // Người lạ nhắn tiếp → lastMessage.senderId đổi lại thành họ.
    const repliedAgain = makeConversation(meId, strangerId, strangerId);
    rerender({ conversations: [repliedAgain] });

    expect(result.current.isStranger(repliedAgain)).toBe(false);
    expect(result.current.strangerConversations).toEqual([]);
  });
});
