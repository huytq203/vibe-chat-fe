import { apiClient } from '@/lib/api/client';
import type {
  StoreConversation,
  StoreFolder,
  StoreFileRef,
  StoreQuota,
  StoreMessage,
  StoreMessagesPage,
  StoreFoldersPage,
  StoreFilesPage,
  CreateReminderInput,
  CreateChecklistInput,
  CreateBookmarkInput,
  SendStoreMessageInput,
  StoreNoteType,
  PatchChecklistItemInput,
  EditStoreMessageInput,
  CreateFolderInput,
  UpdateFolderInput,
  AttachFileInput,
} from '@/features/my-store/types';

/**
 * myStore REST transport. Pure — không đụng cache/state.
 * Hook TanStack Query ở features/my-store/hooks/*.
 */
export const myStoreApi = {
  // ─── Conversation ─────────────────────────────────────────────────────────

  getConversation: (): Promise<StoreConversation> =>
    apiClient.get<StoreConversation>('/api/v1/my-store/conversation'),

  // ─── Messages ─────────────────────────────────────────────────────────────

  listMessages: async (params: { limit?: number; before?: string } = {}): Promise<StoreMessagesPage> => {
    const { data, meta } = await apiClient.rawWithMeta<StoreMessage[]>(
      'GET',
      '/api/v1/my-store/messages',
      { query: { limit: params.limit ?? 20, before: params.before } },
    );
    return { items: data, nextCursor: (meta?.nextCursor as string | null | undefined) ?? null };
  },

  sendMessage: (dto: SendStoreMessageInput): Promise<StoreMessage> =>
    apiClient.post<StoreMessage>('/api/v1/my-store/messages', { body: dto }),

  editMessage: (messageId: string, dto: EditStoreMessageInput): Promise<StoreMessage> =>
    apiClient.patch<StoreMessage>(`/api/v1/my-store/messages/${messageId}`, { body: dto }),

  deleteMessage: (messageId: string): Promise<{ ok: true }> =>
    apiClient.delete<{ ok: true }>(`/api/v1/my-store/messages/${messageId}`),

  // ─── Special message types ─────────────────────────────────────────────────

  createReminder: (dto: CreateReminderInput): Promise<StoreMessage> =>
    apiClient.post<StoreMessage>('/api/v1/my-store/messages/reminder', { body: dto }),

  createChecklist: (dto: CreateChecklistInput): Promise<StoreMessage> =>
    apiClient.post<StoreMessage>('/api/v1/my-store/messages/checklist', { body: dto }),

  createBookmark: (dto: CreateBookmarkInput): Promise<StoreMessage> =>
    apiClient.post<StoreMessage>('/api/v1/my-store/messages/bookmark', { body: dto }),

  patchChecklistItem: (messageId: string, dto: PatchChecklistItemInput): Promise<StoreMessage> =>
    apiClient.patch<StoreMessage>(`/api/v1/my-store/messages/${messageId}/checklist-item`, { body: dto }),

  /** Xoá 1 ghi chú (reminder/checklist/bookmark) — endpoint chuyên biệt theo type. */
  deleteNote: (type: StoreNoteType, messageId: string): Promise<StoreMessage> => {
    const segment: Record<StoreNoteType, string> = {
      REMINDER: 'reminder',
      CHECKLIST: 'checklist',
      BOOKMARK: 'bookmark',
    };
    return apiClient.delete<StoreMessage>(
      `/api/v1/my-store/messages/${segment[type]}/${messageId}`,
    );
  },

  // ─── Folders ──────────────────────────────────────────────────────────────

  listFolders: (): Promise<StoreFoldersPage> =>
    apiClient.get<StoreFoldersPage>('/api/v1/my-store/folders'),

  getFolder: (id: string): Promise<StoreFolder> =>
    apiClient.get<StoreFolder>(`/api/v1/my-store/folders/${id}`),

  createFolder: (dto: CreateFolderInput): Promise<StoreFolder> =>
    apiClient.post<StoreFolder>('/api/v1/my-store/folders', { body: dto }),

  updateFolder: (id: string, dto: UpdateFolderInput): Promise<StoreFolder> =>
    apiClient.patch<StoreFolder>(`/api/v1/my-store/folders/${id}`, { body: dto }),

  deleteFolder: (id: string): Promise<void> =>
    apiClient.delete<void>(`/api/v1/my-store/folders/${id}`),

  // ─── Files ────────────────────────────────────────────────────────────────

  listFiles: async (folderId: string, params: { cursor?: string; limit?: number } = {}): Promise<StoreFilesPage> => {
    const { data, meta } = await apiClient.rawWithMeta<StoreFileRef[]>(
      'GET',
      `/api/v1/my-store/folders/${folderId}/files`,
      { query: { cursor: params.cursor, limit: params.limit ?? 20 } },
    );
    const nextCursor = (meta?.nextCursor as string | null | undefined) ?? null;
    return { items: data, nextCursor };
  },

  attachFile: (folderId: string, dto: AttachFileInput): Promise<StoreFileRef> =>
    apiClient.post<StoreFileRef>(`/api/v1/my-store/folders/${folderId}/files/attach`, { body: dto }),

  renameFile: (folderId: string, fileRefId: string, name: string): Promise<StoreFileRef> =>
    apiClient.patch<StoreFileRef>(`/api/v1/my-store/folders/${folderId}/files/${fileRefId}`, { body: { name } }),

  deleteFile: (folderId: string, fileRefId: string): Promise<void> =>
    apiClient.delete<void>(`/api/v1/my-store/folders/${folderId}/files/${fileRefId}`),

  // ─── Quota ────────────────────────────────────────────────────────────────

  getQuota: (): Promise<StoreQuota> =>
    apiClient.get<StoreQuota>('/api/v1/my-store/quota'),
};
