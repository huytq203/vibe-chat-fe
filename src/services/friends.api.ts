import { apiClient } from '@/lib/api/client';
import type {
  FriendRequestActionResult,
  FriendRequestPage,
  SendFriendRequestInput,
} from '@/features/friends/types';

export const friendsApi = {
  listIncoming: (params: { limit?: number; cursor?: string | null } = {}) =>
    apiClient.get<FriendRequestPage>('/api/v1/friends/requests/incoming', {
      query: {
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
    }),

  listOutgoing: (params: { limit?: number; cursor?: string | null } = {}) =>
    apiClient.get<FriendRequestPage>('/api/v1/friends/requests/outgoing', {
      query: {
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
    }),

  listFriends: (params: { limit?: number; cursor?: string | null } = {}) =>
    apiClient.get<FriendRequestPage>('/api/v1/friends', {
      query: {
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
    }),

  sendRequest: (input: SendFriendRequestInput) =>
    apiClient.post<FriendRequestActionResult>('/api/v1/friends/requests', {
      body: {
        targetUserId: input.targetUserId,
        nickname: input.nickname,
        source: input.source ?? 'SEARCH',
      },
    }),

  cancelRequest: (targetUserId: string) =>
    apiClient.delete<FriendRequestActionResult>(
      `/api/v1/friends/requests/${targetUserId}`,
    ),

  acceptRequest: (targetUserId: string) =>
    apiClient.post<FriendRequestActionResult>(
      `/api/v1/friends/requests/${targetUserId}/accept`,
    ),

  rejectRequest: (targetUserId: string) =>
    apiClient.post<FriendRequestActionResult>(
      `/api/v1/friends/requests/${targetUserId}/reject`,
    ),

  unfriend: (targetUserId: string) =>
    apiClient.delete<FriendRequestActionResult>(`/api/v1/friends/${targetUserId}`),
} as const;
