'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error-message';
import { chatKeys } from '@/services/keys';
import { scheduledMessagesApi } from '@/services/scheduled-messages.api';
import type {
  CreateScheduledMessageInput,
  ScheduledMessage,
  ScheduledMessageStatus,
  UpdateScheduledMessageInput,
} from '@/features/chat/types';

/** Danh sách tin hẹn giờ của chính mình trong 1 conversation. */
export function useScheduledMessages(
  conversationId: string | null,
  status?: ScheduledMessageStatus,
) {
  return useQuery({
    queryKey: conversationId
      ? chatKeys.scheduledMessages(conversationId)
      : ['chat', 'scheduled', 'null'],
    queryFn: () =>
      scheduledMessagesApi.list(conversationId as string, { status }),
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

/** Map error code BE → thông báo tiếng Việt thân thiện. */
function scheduleErrorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : '';
  switch (code) {
    case 'SCHEDULED_MESSAGE_TIME_INVALID':
      return 'Thời điểm hẹn giờ không hợp lệ (phải ở tương lai, tối đa 90 ngày)';
    case 'SCHEDULED_MESSAGE_LIMIT_REACHED':
      return 'Bạn đã đạt giới hạn số tin hẹn giờ trong cuộc trò chuyện này';
    case 'SCHEDULED_MESSAGE_NOT_PENDING':
      return 'Tin hẹn giờ đã được gửi hoặc huỷ, không thể thay đổi';
    case 'CONVERSATION_SEND_RESTRICTED':
      return 'Bạn không có quyền gửi tin trong nhóm này';
    default:
      return getErrorMessage(err) || 'Thao tác tin hẹn giờ thất bại';
  }
}

/** Đặt lịch gửi tin nhắn. */
export function useScheduleMessage() {
  const qc = useQueryClient();
  return useMutation<ScheduledMessage, Error, CreateScheduledMessageInput>({
    mutationFn: (input) => scheduledMessagesApi.create(input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: chatKeys.scheduledMessages(vars.conversationId),
      });
      toast.success('Đã hẹn giờ gửi tin nhắn');
    },
    onError: (err) => toast.error(scheduleErrorMessage(err)),
  });
}

/** Sửa tin hẹn giờ (đổi giờ và/hoặc nội dung) khi còn PENDING. */
export function useUpdateScheduledMessage() {
  const qc = useQueryClient();
  return useMutation<ScheduledMessage, Error, UpdateScheduledMessageInput>({
    mutationFn: (input) => scheduledMessagesApi.update(input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: chatKeys.scheduledMessages(vars.conversationId),
      });
      toast.success('Đã cập nhật tin hẹn giờ');
    },
    onError: (err) => toast.error(scheduleErrorMessage(err)),
  });
}

/** Huỷ tin hẹn giờ khi còn PENDING. */
export function useCancelScheduledMessage() {
  const qc = useQueryClient();
  return useMutation<
    ScheduledMessage,
    Error,
    { conversationId: string; scheduledId: string }
  >({
    mutationFn: ({ conversationId, scheduledId }) =>
      scheduledMessagesApi.cancel(conversationId, scheduledId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: chatKeys.scheduledMessages(vars.conversationId),
      });
      toast.success('Đã huỷ tin hẹn giờ');
    },
    onError: (err) => toast.error(scheduleErrorMessage(err)),
  });
}
