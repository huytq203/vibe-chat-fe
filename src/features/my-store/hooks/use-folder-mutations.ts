'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import type { CreateFolderInput, UpdateFolderInput } from '@/features/my-store/types';

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
