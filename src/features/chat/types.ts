export type ConversationType = 'DIRECT' | 'GROUP' | 'CHANNEL';
export type EncryptionType = 'SERVER' | 'E2E';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'FILE'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACT'
  | 'SYSTEM'
  | 'CALL';

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  keyVersion: number;
};

export type LastMessagePreview = {
  id: string;
  senderId: string;
  type: MessageType;
  preview: string | null;
  createdAt: string;
};

export type ConversationMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  nickname: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};

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
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  encryptionType: EncryptionType;
  plaintext: string | null;
  encrypted: EncryptedBlob | null;
  contentPreview: string | null;
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  isView: boolean;
  createdAt: string;
};

export type SendMessageInput = {
  conversationId: string;
  plaintext: string;
  clientNonce?: string;
  type?: MessageType;
  replyToMessageId?: string;
};

export type Presence = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastSeenLabel: string | null;
};

export type MessagesPage = {
  items: Message[];
  nextCursor: string | null;
};
