import { describe, expect, it } from 'vitest';
import type { Conversation, GroupSettings, MemberRole } from './types';
import {
  canEditGroupInfo,
  canPinMessage,
  canSendMessage,
  getLeaderLabel,
  getMyRole,
  isAdminRole,
} from './utils';

const ME = 'me-1';

function makeConv(opts: {
  type?: Conversation['type'];
  myRole?: MemberRole;
  settings?: Partial<GroupSettings>;
}): Conversation {
  const { type = 'GROUP', myRole = 'MEMBER', settings } = opts;
  return {
    id: 'c1',
    type,
    name: 'Nhóm',
    description: null,
    avatarUrl: null,
    ownerId: 'owner',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 0,
    memberIds: [ME],
    members: [
      { userId: ME, username: 'me', displayName: 'Me', avatarUrl: null, nickname: null, role: myRole },
    ],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    settings: settings as GroupSettings | undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getMyRole / isAdminRole', () => {
  it('lấy đúng vai trò của mình', () => {
    expect(getMyRole(makeConv({ myRole: 'ADMIN' }), ME)).toBe('ADMIN');
    expect(getMyRole(makeConv({ myRole: 'MEMBER' }), 'unknown')).toBeNull();
  });
  it('OWNER/ADMIN/MODERATOR là quản trị viên', () => {
    expect(isAdminRole('OWNER')).toBe(true);
    expect(isAdminRole('MODERATOR')).toBe(true);
    expect(isAdminRole('MEMBER')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

describe('canSendMessage', () => {
  it('DIRECT luôn cho gửi', () => {
    expect(canSendMessage(makeConv({ type: 'DIRECT' }), ME)).toBe(true);
  });
  it('whoCanSend=ALL → mọi thành viên gửi được', () => {
    expect(canSendMessage(makeConv({ settings: { whoCanSend: 'ALL' } }), ME)).toBe(true);
  });
  it('whoCanSend=ADMIN → MEMBER không gửi được, ADMIN gửi được', () => {
    expect(canSendMessage(makeConv({ myRole: 'MEMBER', settings: { whoCanSend: 'ADMIN' } }), ME)).toBe(false);
    expect(canSendMessage(makeConv({ myRole: 'ADMIN', settings: { whoCanSend: 'ADMIN' } }), ME)).toBe(true);
  });
});

describe('canPinMessage / canEditGroupInfo', () => {
  it('mặc định whoCanPin=ADMIN → MEMBER không ghim được', () => {
    expect(canPinMessage(makeConv({ myRole: 'MEMBER' }), ME)).toBe(false);
  });
  it('whoCanEditInfo=ALL → MEMBER sửa info được', () => {
    expect(canEditGroupInfo(makeConv({ myRole: 'MEMBER', settings: { whoCanEditInfo: 'ALL' } }), ME)).toBe(true);
  });
});

describe('getLeaderLabel', () => {
  it('OWNER → Trưởng nhóm; ADMIN/MODERATOR → Phó nhóm; MEMBER → null', () => {
    expect(getLeaderLabel('OWNER')).toBe('Trưởng nhóm');
    expect(getLeaderLabel('ADMIN')).toBe('Phó nhóm');
    expect(getLeaderLabel('MODERATOR')).toBe('Phó nhóm');
    expect(getLeaderLabel('MEMBER')).toBeNull();
  });
});
