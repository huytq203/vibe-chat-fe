import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { chatKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import type { Conversation, Message } from '@/features/chat/types';
import {
  makePatchConvInList,
  makeShouldBumpUnread,
  makeUpsertMessage,
  type RealtimeHandlerDeps,
} from './chat-realtime-cache';
import { makeOnConversationNotify, makeOnMessageNew } from './chat-realtime-message-handlers';

const LIST_KEY = chatKeys.conversationList({ page: 1, limit: 30 });

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'other',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 5,
    memberIds: ['me', 'other'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'other',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: 'hi',
    attachments: [],
    contentPreview: 'hi',
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: '2026-07-11T10:00:00.000Z',
    ...overrides,
  };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData<Conversation[]>(LIST_KEY, [makeConversation()]);
  const deps: RealtimeHandlerDeps = {
    qc,
    joinedRef: { current: null },
    setSelected: () => {},
    typingTimersRef: { current: {} },
    patchConvInList: makePatchConvInList(qc),
    upsertMessage: makeUpsertMessage(qc),
    shouldBumpUnread: makeShouldBumpUnread(),
  };
  return { qc, deps };
}

function getConv(qc: QueryClient): Conversation {
  const list = qc.getQueryData<Conversation[]>(LIST_KEY);
  const conv = list?.find((c) => c.id === 'c1');
  if (!conv) throw new Error('conversation c1 not found in cache');
  return conv;
}

describe('unread badge realtime — message:new rồi conversation:notify cho cùng 1 tin', () => {
  beforeEach(() => {
    useTypingStore.setState({ byConv: {} });
    useAuthStore.getState().setUser({
      id: 'me',
      username: 'me',
      email: null,
      phone: null,
      displayName: 'Me',
      avatarUrl: null,
      coverUrl: null,
      bio: null,
      gender: null,
      dateOfBirth: null,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
    });
  });

  it('xoá typing của sender ngay khi message mới tới', () => {
    const { deps } = setup();
    useTypingStore.getState().setTyping('c1', 'other', true);

    makeOnMessageNew(deps)(makeMessage());

    expect(useTypingStore.getState().byConv.c1).not.toContain('other');
  });

  it('vẫn tăng unreadCount dù message:new đã insert nội dung trước đó (conv chưa mở, tin không phải của mình)', () => {
    const { qc, deps } = setup();
    const onMessageNew = makeOnMessageNew(deps);
    const onConversationNotify = makeOnConversationNotify(deps);
    const message = makeMessage();

    // BE bắn cả 2 event cho cùng 1 tin — message:new tới trước (race), rồi conversation:notify.
    onMessageNew(message);
    onConversationNotify({ conversationId: 'c1', message });

    expect(getConv(qc).unreadCount).toBe(1);
  });

  it('không bump khi conv đang mở (isOpen)', () => {
    const { qc, deps } = setup();
    deps.joinedRef.current = 'c1';
    const onConversationNotify = makeOnConversationNotify(deps);
    onConversationNotify({ conversationId: 'c1', message: makeMessage() });
    expect(getConv(qc).unreadCount).toBe(0);
  });

  it('không bump khi tin do chính mình gửi (thiết bị khác)', () => {
    const { qc, deps } = setup();
    const onConversationNotify = makeOnConversationNotify(deps);
    onConversationNotify({ conversationId: 'c1', message: makeMessage({ senderId: 'me' }) });
    expect(getConv(qc).unreadCount).toBe(0);
  });

  it('conversation:notify trùng lặp cho cùng 1 tin chỉ bump 1 lần', () => {
    const { qc, deps } = setup();
    const onConversationNotify = makeOnConversationNotify(deps);
    const message = makeMessage();
    onConversationNotify({ conversationId: 'c1', message });
    onConversationNotify({ conversationId: 'c1', message });
    expect(getConv(qc).unreadCount).toBe(1);
  });
});
