'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  clientApi,
  type ClientContactInput,
} from '../services/client.api';
import { taskKeys } from '../services/keys';
import { tasksApi } from '../services/tasks.api';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useProjectClient(projectId: string) {
  return useQuery({
    queryKey: taskKeys.client(projectId),
    queryFn: () => clientApi.get(projectId),
  });
}

export function useUpsertClient(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => clientApi.upsert(projectId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã lưu khách hàng');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể lưu khách hàng')),
  });
}

export function useAddContact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientContactInput) =>
      clientApi.addContact(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã thêm người liên hệ');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể thêm người liên hệ')),
  });
}

export function useUpdateContact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      input,
    }: {
      contactId: string;
      input: ClientContactInput;
    }) => clientApi.updateContact(projectId, contactId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã cập nhật người liên hệ');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể cập nhật người liên hệ')),
  });
}

export function useRemoveContact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      clientApi.removeContact(projectId, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã xoá người liên hệ');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Không thể xoá người liên hệ')),
  });
}

const inviteErrorMessages: Record<string, string> = {
  CLIENT_CONTACT_ALREADY_LINKED: 'Người liên hệ đã được gắn với tài khoản khác',
  MEMBER_ALREADY_EXISTS: 'Người dùng đã là thành viên project',
  CLIENT_CONTACT_NOT_FOUND: 'Không tìm thấy người liên hệ',
};

export function useInviteClientContact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, contactId }: { userId: string; contactId: string }) =>
      tasksApi.addMember(projectId, userId, { role: 'CLIENT', contactId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
      toast.success('Đã mời người liên hệ làm khách hàng');
    },
    onError: (error) => {
      const code = error instanceof Error
        ? ('code' in error && typeof error.code === 'string' ? error.code : error.message)
        : '';
      toast.error(inviteErrorMessages[code] ?? 'Không thể mời người liên hệ');
      if (code === 'CLIENT_CONTACT_ALREADY_LINKED') {
        void queryClient.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      }
    },
  });
}
