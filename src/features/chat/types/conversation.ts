import type { ConversationMember, GroupSettings } from './member';
import type { EncryptionType, LastMessagePreview } from './message';

export type ConversationType = 'DIRECT' | 'GROUP' | 'CHANNEL' | 'SELF';

export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  encryptionType: EncryptionType;
  memberCount: number;
  messageCount: number;
  memberIds: string[];
  members?: ConversationMember[];
  lastMessage: LastMessagePreview | null;
  lastMessageAt: string | null;
  unreadCount: number;
  // Ghim hội thoại — conv đã ghim luôn nổi lên đầu danh sách. BE sẽ trả 2 field
  // này (endpoint pin đang chờ chốt — xem chatApi.pinConversation).
  isPinned?: boolean;
  pinnedAt?: string | null;
  isLocked?: boolean;
  /** Nền hội thoại — null = mặc định; "theme:key" = preset; "custom:{mediaId}" = ảnh tự chọn */
  background?: string | null;
  // Mute per-user (đã normalize bởi BE). isMuted=true + mutedUntil=null = vĩnh viễn;
  // mutedUntil=<ISO> = tắt có hạn; hết hạn BE tự trả isMuted=false. Xem 22-mute-notifications.md.
  isMuted?: boolean;
  mutedUntil?: string | null;
  /** Cài đặt quyền hạn — chỉ có ở GROUP/CHANNEL (xem 28-group-settings.md). */
  settings?: GroupSettings;
  /** Số tin đang ghim (tối đa 5) — biết mà không cần gọi endpoint pinned (xem 29). */
  pinnedCount?: number;
  /** Public/private nhóm — đổi qua PATCH /conversations/{id}. */
  isPublic?: boolean;
  createdAt: string;
};
