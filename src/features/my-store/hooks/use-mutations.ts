'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { myStoreApi } from '@/services/my-store.api';
import { mediaApi } from '@/services/media.api';
import { myStoreKeys, chatKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import { buildEncryptedSendPayload } from '@/lib/crypto/encrypt-message';
import { encryptStoreMetadata, getStoreConversationId } from '@/features/my-store/lib/store-encrypt';
import type { MediaResponse } from '@/features/chat/types';
import type {
  StoreMessage,
  StoreMessagesPage,
  CreateReminderInput,
  CreateChecklistInput,
  CreateBookmarkInput,
  ReminderSecret,
  ChecklistSecret,
  BookmarkSecret,
  StoreNoteType,
  PatchChecklistItemInput,
  SendStoreMessageInput,
  EditStoreMessageInput,
  CreateFolderInput,
  UpdateFolderInput,
  AttachFileInput,
} from '@/features/my-store/types';

type MessagesCache = InfiniteData<StoreMessagesPage, string | null>;

/** Prepend 1 message mới vào đầu trang đầu của cache infinite. */
function prependMessage(qc: ReturnType<typeof useQueryClient>, message: StoreMessage) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: [
        { ...old.pages[0], items: [message, ...(old.pages[0]?.items ?? [])] },
        ...old.pages.slice(1),
      ],
    };
  });
}

/** Gỡ hẳn 1 message khỏi cache infinite (dùng cho xoá ghi chú → biến mất ngay). */
function removeMessage(qc: ReturnType<typeof useQueryClient>, messageId: string) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.filter((m) => m.id !== messageId),
      })),
    };
  });
}

/** Patch 1 message trong cache infinite. */
function patchMessage(
  qc: ReturnType<typeof useQueryClient>,
  messageId: string,
  patch: (m: StoreMessage) => StoreMessage,
) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => (m.id === messageId ? patch(m) : m)),
      })),
    };
  });
}

// ─── Message mutations ─────────────────────────────────────────────────────

const SHARED_TYPES = ['MEDIA', 'FILE', 'LINK'] as const;

/**
 * Sau khi gửi/gỡ tin có media trong myStore: refetch quota (cập nhật thanh dung lượng)
 * + refetch shared tabs (Ảnh/Video, Tài liệu, Liên kết) để hiển thị realtime.
 */
function invalidateStoreUsage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId?: string,
): void {
  qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
  if (conversationId) {
    for (const t of SHARED_TYPES) {
      qc.invalidateQueries({ queryKey: chatKeys.shared(conversationId, t) });
    }
  }
}

export function useSendStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SendStoreMessageInput) => {
      const { plaintext, ...rest } = dto;
      // Mã hoá nội dung text bằng DEK của SELF conv (fallback plaintext nếu thiếu key).
      if (plaintext && plaintext.trim()) {
        try {
          const convId = await getStoreConversationId(qc);
          const enc = await buildEncryptedSendPayload(convId, plaintext);
          return myStoreApi.sendMessage({ ...rest, ...enc });
        } catch {
          return myStoreApi.sendMessage({ ...rest, plaintext });
        }
      }
      return myStoreApi.sendMessage({ ...rest });
    },
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      invalidateStoreUsage(qc, msg.conversationId);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useEditStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: EditStoreMessageInput }) =>
      myStoreApi.editMessage(messageId, dto),
    onSuccess: (updated) => patchMessage(qc, updated.id, () => updated),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => myStoreApi.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Lấy conversationId từ cache trước khi patch để invalidate shared tabs.
      const cache = qc.getQueryData<MessagesCache>(myStoreKeys.messages());
      const convId = cache?.pages
        .flatMap((p) => p.items)
        .find((m) => m.id === messageId)?.conversationId;
      patchMessage(qc, messageId, (m) => ({ ...m, isDeleted: true, plaintext: null }));
      invalidateStoreUsage(qc, convId);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

/** Xoá 1 ghi chú (reminder/checklist/bookmark) — gỡ ngay khỏi list, không cần reload. */
export function useDeleteStoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, messageId }: { type: StoreNoteType; messageId: string }) =>
      myStoreApi.deleteNote(type, messageId),
    onSuccess: (_, { messageId }) => {
      removeMessage(qc, messageId);
      toast.success('Đã xoá');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateReminderInput) => {
      // remindAt operational (plaintext); title/note mã hoá.
      const secret: ReminderSecret = { title: dto.title, ...(dto.note ? { note: dto.note } : {}) };
      const encryptedMetadata = await encryptStoreMetadata(qc, secret);
      return myStoreApi.createReminder({ remindAt: dto.remindAt, encryptedMetadata });
    },
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã tạo nhắc nhở');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateChecklistInput) => {
      // FE sinh id từng item (operational), text mã hoá trong encryptedMetadata.
      const withIds = dto.items.map((text) => ({ id: crypto.randomUUID(), text }));
      const secret: ChecklistSecret = { title: dto.title, items: withIds };
      const encryptedMetadata = await encryptStoreMetadata(qc, secret);
      return myStoreApi.createChecklist({ itemIds: withIds.map((i) => i.id), encryptedMetadata });
    },
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã tạo checklist');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateBookmarkInput) => {
      const secret: BookmarkSecret = {
        url: dto.url,
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description ? { description: dto.description } : {}),
      };
      const encryptedMetadata = await encryptStoreMetadata(qc, secret);
      return myStoreApi.createBookmark({ encryptedMetadata });
    },
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã lưu bookmark');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function usePatchChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: PatchChecklistItemInput }) =>
      myStoreApi.patchChecklistItem(messageId, dto),
    onSuccess: (updated) => patchMessage(qc, updated.id, () => updated),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

// ─── Folder mutations ──────────────────────────────────────────────────────

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFolderInput) => myStoreApi.createFolder(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: myStoreKeys.folders() }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFolderInput }) =>
      myStoreApi.updateFolder(id, dto),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: myStoreKeys.folders() });
      qc.setQueryData(myStoreKeys.folder(updated.id), updated);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => myStoreApi.deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myStoreKeys.folders() });
      qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

// ─── File mutations ────────────────────────────────────────────────────────

// > 10MB hoặc video → presigned URL (Cách B); còn lại upload trực tiếp (Cách A).
const DIRECT_UPLOAD_MAX = 10 * 1024 * 1024;

/** Upload 1 file lên media storage rồi trả về MediaAsset đã READY. */
async function uploadStoreMedia(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MediaResponse> {
  const isVideo = file.type.startsWith('video/');
  if (!isVideo && file.size <= DIRECT_UPLOAD_MAX) {
    return mediaApi.uploadDirect(file, 'ATTACHMENT', onProgress);
  }
  const pre = await mediaApi.presign({
    category: isVideo ? 'VIDEO' : 'ATTACHMENT',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  });
  await mediaApi.putToStorage(pre.uploadUrl, file, pre.contentType, onProgress);
  return mediaApi.confirm(pre.id);
}

/** Upload 1 file rồi đính (attach) vào folder myStore. onProgress báo % upload (0-100). */
export function useUploadStoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      file,
      onProgress,
    }: {
      folderId: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      const media = await uploadStoreMedia(file, onProgress);
      return myStoreApi.attachFile(folderId, { mediaId: media.id, name: file.name });
    },
    onSuccess: (_ref, { folderId }) => {
      qc.invalidateQueries({ queryKey: myStoreKeys.files(folderId) });
      qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useAttachFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, dto }: { folderId: string; dto: AttachFileInput }) =>
      myStoreApi.attachFile(folderId, dto),
    onSuccess: (_file, { folderId }) => {
      qc.invalidateQueries({ queryKey: myStoreKeys.files(folderId) });
      qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, fileRefId, name }: { folderId: string; fileRefId: string; name: string }) =>
      myStoreApi.renameFile(folderId, fileRefId, name),
    onSuccess: (_file, { folderId }) =>
      qc.invalidateQueries({ queryKey: myStoreKeys.files(folderId) }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, fileRefId }: { folderId: string; fileRefId: string }) =>
      myStoreApi.deleteFile(folderId, fileRefId),
    onSuccess: (_, { folderId }) => {
      qc.invalidateQueries({ queryKey: myStoreKeys.files(folderId) });
      qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
