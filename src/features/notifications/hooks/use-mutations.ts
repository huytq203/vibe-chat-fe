'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '@/services/notifications.api';
import { notificationKeys } from '@/services/keys';
import type { RegisterFcmTokenInput } from '../types';

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => invalidate(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: (res) => {
      invalidate(qc);
      toast.success(`Đã đánh dấu ${res.updated} thông báo`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => invalidate(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegisterFcmToken() {
  return useMutation({
    mutationFn: (input: RegisterFcmTokenInput) =>
      notificationsApi.registerFcmToken(input),
  });
}

export function useDeleteFcmToken() {
  return useMutation({
    mutationFn: (token: string) => notificationsApi.deleteFcmToken(token),
  });
}
