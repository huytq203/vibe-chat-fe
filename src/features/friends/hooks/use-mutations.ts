'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { friendsApi } from '@/services/friends.api';
import { friendKeys, userKeys } from '@/services/keys';
import type { SendFriendRequestInput } from '../types';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: userKeys.all });
  qc.invalidateQueries({ queryKey: friendKeys.incoming() });
  qc.invalidateQueries({ queryKey: friendKeys.outgoing() });
  qc.invalidateQueries({ queryKey: friendKeys.list() });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendFriendRequestInput) => friendsApi.sendRequest(input),
    onSuccess: (data) => {
      invalidateAll(qc);
      if (data.status === 'ACCEPTED') {
        toast.success('Đã trở thành bạn bè 🎉');
      } else {
        toast.success('Đã gửi lời mời kết bạn');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => friendsApi.cancelRequest(targetUserId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Đã huỷ lời mời');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => friendsApi.acceptRequest(targetUserId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Đã chấp nhận lời mời');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => friendsApi.rejectRequest(targetUserId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Đã từ chối lời mời');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnfriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => friendsApi.unfriend(targetUserId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Đã huỷ kết bạn');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
