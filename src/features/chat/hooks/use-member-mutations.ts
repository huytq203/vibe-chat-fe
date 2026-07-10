'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';

/** Thêm thành viên vào nhóm (OWNER/ADMIN). BE trả Conversation đã cập nhật members. */
export function useAddMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userIds }: { conversationId: string; userIds: string[] }) =>
      chatApi.addMembers(conversationId, userIds),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã thêm thành viên');
    },
    onError: (e: Error) => toast.error(e.message || 'Thêm thành viên thất bại'),
  });
}

/** Kick 1 thành viên khỏi nhóm (OWNER/ADMIN/MOD, chỉ role thấp hơn). Trả { ok: true }. */
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.removeMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      // BE chỉ trả { ok: true } → refetch detail để lấy members[] mới.
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã xoá thành viên');
    },
    onError: (e: Error) => toast.error(e.message || 'Xoá thành viên thất bại'),
  });
}

/** Tự rời nhóm. OWNER không rời được (BE chặn → toast lỗi). */
export function useLeaveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.leaveConversation(conversationId),
    onSuccess: (_res, conversationId) => {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e: Error) => toast.error(e.message || 'Rời nhóm thất bại'),
  });
}

/** Duyệt yêu cầu vào nhóm (OWNER/ADMIN/MOD) → thêm người gửi làm MEMBER. */
export function useAcceptJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, requestId }: { conversationId: string; requestId: string }) =>
      chatApi.acceptJoinRequest(conversationId, requestId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.joinRequests(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã duyệt yêu cầu vào nhóm');
    },
    onError: (e: Error) => toast.error(e.message || 'Duyệt yêu cầu thất bại'),
  });
}

/** Từ chối yêu cầu vào nhóm (OWNER/ADMIN/MOD). reason optional. */
export function useRejectJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      requestId,
      reason,
    }: {
      conversationId: string;
      requestId: string;
      reason?: string;
    }) => chatApi.rejectJoinRequest(conversationId, requestId, reason),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.joinRequests(conversationId) });
      toast.success('Đã từ chối yêu cầu');
    },
    onError: (e: Error) => toast.error(e.message || 'Từ chối yêu cầu thất bại'),
  });
}

/** Chặn (ban) 1 thành viên. BE phát WS member_removed (reason KICKED) → refetch detail. */
export function useBanMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.banMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.bannedMembers(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã chặn thành viên');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Chặn thành viên thất bại')),
  });
}

/** Bỏ chặn 1 thành viên. */
export function useUnbanMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.unbanMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.bannedMembers(conversationId) });
      toast.success('Đã bỏ chặn thành viên');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Bỏ chặn thất bại')),
  });
}

/** Cấp/gỡ quyền phó nhóm (ADMIN ↔ MEMBER). Chỉ OWNER. Refetch detail để cập nhật role. */
export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId, role }: {
      conversationId: string; userId: string; role: 'ADMIN' | 'MEMBER';
    }) => chatApi.setMemberRole(conversationId, userId, role),
    onSuccess: (_res, { conversationId, role }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      toast.success(role === 'ADMIN' ? 'Đã cấp quyền phó nhóm' : 'Đã gỡ quyền phó nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật quyền thất bại')),
  });
}

/** Nhượng quyền trưởng nhóm. Chỉ OWNER. Refetch detail + list (role mình đổi). */
export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.transferOwnership(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã nhượng quyền trưởng nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Nhượng quyền thất bại')),
  });
}
