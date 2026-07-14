import { apiClient } from '@/lib/api/client';

export interface CreateMessageCallbackBody {
  callbackData: string;
  clientNonce?: string;
}

export interface CreateMessageCallbackResponse {
  callbackId: string;
}

export const callbackApi = {
  createCallback: (
    conversationId: string,
    messageId: string,
    body: CreateMessageCallbackBody,
  ) =>
    apiClient.post<CreateMessageCallbackResponse>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/callbacks`,
      { body },
    ),
} as const;
