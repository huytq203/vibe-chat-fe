'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import type {
  StoreMessage,
  StoreMessagesPage,
  CreateReminderInput,
  CreateChecklistInput,
  CreateBookmarkInput,
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

export function useSendStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendStoreMessageInput) => myStoreApi.sendMessage(dto),
    onSuccess: (msg) => prependMessage(qc, msg),
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
    onSuccess: (_, messageId) =>
      patchMessage(qc, messageId, (m) => ({ ...m, isDeleted: true, plaintext: null })),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReminderInput) => myStoreApi.createReminder(dto),
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
    mutationFn: (dto: CreateChecklistInput) => myStoreApi.createChecklist(dto),
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
    mutationFn: (dto: CreateBookmarkInput) => myStoreApi.createBookmark(dto),
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
