import type { MessageType } from '@/features/chat/types';

// ─── Re-export CHAT MessageType để dùng chung ─────────────────────────────
export type { MessageType };

export type StoreMessageType = MessageType | 'REMINDER' | 'CHECKLIST' | 'BOOKMARK';

/** Các loại ghi chú myStore có endpoint xoá chuyên biệt. */
export type StoreNoteType = 'REMINDER' | 'CHECKLIST' | 'BOOKMARK';

// ─── Conversation ─────────────────────────────────────────────────────────
export type StoreConversation = {
  id: string;
  type: 'SELF';
  encryptionType: 'NONE';
  ownerId: string;
  createdAt: string;
};

// ─── Message metadata shapes ───────────────────────────────────────────────

export type ReminderMetadata = {
  title: string;
  remindAt: string;
  note?: string;
  fired: boolean;
};

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type ChecklistMetadata = {
  title: string;
  items: ChecklistItem[];
};

export type BookmarkMetadata = {
  url: string;
  title?: string;
  description?: string;
};

// ─── Message ──────────────────────────────────────────────────────────────

export type StoreMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: StoreMessageType;
  plaintext: string | null;
  metadata: ReminderMetadata | ChecklistMetadata | BookmarkMetadata | Record<string, unknown> | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoreMessagesPage = {
  items: StoreMessage[];
  nextCursor: string | null;
};

// ─── Folder ───────────────────────────────────────────────────────────────

export type StoreFolder = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  children?: StoreFolder[];
  createdAt: string;
  updatedAt: string;
};

export type StoreFoldersPage = StoreFolder[];

// ─── FileRef ──────────────────────────────────────────────────────────────

export type StoreFileRef = {
  id: number;
  folderId: string;
  userId: string;
  mediaId: string;
  name: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
};

export type StoreFilesPage = {
  items: StoreFileRef[];
  nextCursor: string | null;
};

// ─── Quota ────────────────────────────────────────────────────────────────

export type StoreQuota = {
  userId: string;
  usedBytes: number;
  maxBytes: number;
  usedFormatted: string;
  maxFormatted: string;
  percentUsed: number;
};

// ─── API input types ──────────────────────────────────────────────────────

export type SendStoreMessageInput = {
  type?: MessageType;
  plaintext?: string;
  attachmentIds?: string[];
  clientNonce?: string;
  metadata?: Record<string, unknown>;
};

export type EditStoreMessageInput = {
  plaintext: string;
};

export type CreateReminderInput = {
  title: string;
  remindAt: string;
  note?: string;
};

export type CreateChecklistInput = {
  title: string;
  items: string[];
};

export type CreateBookmarkInput = {
  url: string;
  title?: string;
  description?: string;
};

export type PatchChecklistItemInput = {
  itemId: string;
  checked: boolean;
};

export type CreateFolderInput = {
  name: string;
  parentId?: string;
};

export type UpdateFolderInput = {
  name?: string;
  parentId?: string | null;
};

export type AttachFileInput = {
  mediaId: string;
  name?: string;
};
