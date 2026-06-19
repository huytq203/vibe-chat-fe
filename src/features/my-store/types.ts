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
  encryptionType: 'SERVER';
  ownerId: string;
  createdAt: string;
};

// ─── Message metadata shapes ───────────────────────────────────────────────

/** Blob metadata nhạy cảm đã mã hoá (Phase 1). FE giải mã để hiển thị. */
export type EncryptedMetadataBlob = { ciphertext: string; iv: string; authTag: string };

export type ReminderMetadata = {
  remindAt: string;
  fired: boolean;
  // title/note: plaintext (back-compat) hoặc nằm trong `encrypted` (Phase 1).
  title?: string;
  note?: string;
  encrypted?: EncryptedMetadataBlob;
};

export type ChecklistItem = {
  id: string;
  checked: boolean;
  // text: plaintext (back-compat) hoặc nằm trong `encrypted` (Phase 1).
  text?: string;
};

export type ChecklistMetadata = {
  items: ChecklistItem[];
  title?: string;
  encrypted?: EncryptedMetadataBlob;
};

export type BookmarkMetadata = {
  url?: string;
  title?: string;
  description?: string;
  encrypted?: EncryptedMetadataBlob;
};

/** Payload giải mã của encrypted blob theo từng loại note. */
export type ReminderSecret = { title: string; note?: string };
export type ChecklistSecret = { title: string; items: { id: string; text: string }[] };
export type BookmarkSecret = { url: string; title?: string; description?: string };

// ─── Message ──────────────────────────────────────────────────────────────

export type StoreMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: StoreMessageType;
  plaintext: string | null;
  // Tin TEXT FE-encrypted (giống chat): plaintext=null, FE giải mã ciphertext.
  encrypted?: boolean;
  ciphertext?: string | null;
  iv?: string | null;
  authTag?: string | null;
  keyId?: string | null;
  keyVersion?: number | null;
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

// ── Wire payload gửi lên BE sau khi FE đã mã hoá (operational + encryptedMetadata) ──
export type CreateReminderPayload = { remindAt: string; encryptedMetadata: EncryptedMetadataBlob };
export type CreateChecklistPayload = { itemIds: string[]; encryptedMetadata: EncryptedMetadataBlob };
export type CreateBookmarkPayload = { encryptedMetadata: EncryptedMetadataBlob };
export type SendStoreMessagePayload = {
  type?: MessageType;
  plaintext?: string;
  encrypted?: boolean;
  ciphertext?: string;
  iv?: string;
  authTag?: string;
  keyId?: string;
  keyVersion?: number;
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
