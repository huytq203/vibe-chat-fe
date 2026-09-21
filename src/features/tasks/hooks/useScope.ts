'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scopeApi } from '../services/scope.api';
import { taskKeys } from '../services/keys';

type AddScopeItemInput = Parameters<typeof scopeApi.addItem>[1];
type UpdateScopeItemInput = Parameters<typeof scopeApi.updateItem>[2];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useProjectScope(projectId: string) {
  return useQuery({
    queryKey: taskKeys.scope(projectId),
    queryFn: () => scopeApi.get(projectId),
  });
}

export function useUpdateScopeDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rawDocument,
      version,
    }: {
      rawDocument: string;
      version: number;
    }) => scopeApi.updateDocument(projectId, rawDocument, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.scope(projectId) });
      toast.success('Đã lưu tài liệu phạm vi');
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(error, 'Không thể lưu tài liệu phạm vi'),
      ),
  });
}

export function useAddScopeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddScopeItemInput) => scopeApi.addItem(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.scope(projectId) });
      toast.success('Đã thêm hạng mục');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể thêm hạng mục')),
  });
}

export function useUpdateScopeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string;
      input: UpdateScopeItemInput;
    }) => scopeApi.updateItem(projectId, itemId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.scope(projectId) });
      toast.success('Đã cập nhật hạng mục');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể cập nhật hạng mục')),
  });
}

export function useRemoveScopeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, version }: { itemId: string; version: number }) =>
      scopeApi.removeItem(projectId, itemId, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.scope(projectId) });
      toast.success('Đã xoá hạng mục');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể xoá hạng mục')),
  });
}
