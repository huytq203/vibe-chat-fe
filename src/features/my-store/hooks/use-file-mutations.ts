'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import type { AttachFileInput } from '@/features/my-store/types';
import { uploadStoreMedia } from './store-mutation-helpers';

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
