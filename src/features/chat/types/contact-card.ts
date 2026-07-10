import type { Message } from './message';

// ─── Contact card (chia sẻ danh thiếp) ─────────────────────────────────────────
/** Target khi chia sẻ danh thiếp: tới bạn bè (tạo direct) hoặc thẳng vào nhóm. */
export type ShareContactTarget =
  | { type: 'friend'; userId: string }
  | { type: 'group'; conversationId: string };

// BE: message.type='CONTACT', metadata.contact = snapshot hồ sơ user được chia sẻ.

export type ContactCardMetadata = {
  contactUserId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

/** Đọc contact card từ message.metadata; null nếu không hợp lệ. */
export function readContactCard(message: Message): ContactCardMetadata | null {
  if (message.type !== 'CONTACT' || !message.metadata) return null;
  const c = (message.metadata as Record<string, unknown>).contact as
    | Partial<ContactCardMetadata>
    | undefined;
  if (!c || typeof c.contactUserId !== 'string') return null;
  return {
    contactUserId: c.contactUserId,
    displayName: typeof c.displayName === 'string' ? c.displayName : 'Người dùng',
    username: typeof c.username === 'string' ? c.username : '',
    avatarUrl: typeof c.avatarUrl === 'string' ? c.avatarUrl : null,
  };
}
