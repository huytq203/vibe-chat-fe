import { apiClient } from '@/lib/api/client';
import type {
  CreateScheduledMessageInput,
  ScheduledMessage,
  ScheduledMessageStatus,
  UpdateScheduledMessageInput,
} from '@/features/chat/types';

/** Body chung cho create/update — bỏ field định danh (conversationId/scheduledId). */
type SchedulePayload = {
  scheduledAt?: string;
  plaintext?: string;
  type?: ScheduledMessage['type'];
  attachmentIds?: string[];
  metadata?: Record<string, unknown>;
  replyToMessageId?: string;
  mentions?: CreateScheduledMessageInput['mentions'];
  selfDestructTtl?: number;
};

const toPayload = (
  input: CreateScheduledMessageInput | UpdateScheduledMessageInput,
): SchedulePayload => ({
  scheduledAt: input.scheduledAt,
  plaintext: input.plaintext ? input.plaintext : undefined,
  type: input.type,
  attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
  metadata: input.metadata,
  replyToMessageId: input.replyToMessageId,
  mentions: input.mentions?.length ? input.mentions : undefined,
  selfDestructTtl: input.selfDestructTtl,
});

/**
 * Transport REST cho tin nhắn hẹn giờ. Pure — không đụng cache/state.
 * Hook TanStack Query ở features/chat/hooks/use-scheduled-messages.ts.
 * Contract BE: conversations/{id}/scheduled-messages (xem BE messages module).
 */
export const scheduledMessagesApi = {
  list: async (
    conversationId: string,
    params: { status?: ScheduledMessageStatus; limit?: number } = {},
  ): Promise<ScheduledMessage[]> => {
    const { data } = await apiClient.rawWithMeta<ScheduledMessage[]>(
      'GET',
      `/api/v1/conversations/${conversationId}/scheduled-messages`,
      { query: { status: params.status, limit: params.limit } },
    );
    return data;
  },

  create: (input: CreateScheduledMessageInput) =>
    apiClient.post<ScheduledMessage>(
      `/api/v1/conversations/${input.conversationId}/scheduled-messages`,
      { body: toPayload(input) },
    ),

  update: (input: UpdateScheduledMessageInput) =>
    apiClient.patch<ScheduledMessage>(
      `/api/v1/conversations/${input.conversationId}/scheduled-messages/${input.scheduledId}`,
      { body: toPayload(input) },
    ),

  cancel: (conversationId: string, scheduledId: string) =>
    apiClient.delete<ScheduledMessage>(
      `/api/v1/conversations/${conversationId}/scheduled-messages/${scheduledId}`,
    ),
};
