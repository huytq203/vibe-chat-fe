import { apiClient } from '@/lib/api/client';
import type {
  BlockActionResult,
  BlockListPage,
  BlockUserInput,
} from '@/features/friends/types';

export const blocksApi = {
  list: (params: { limit?: number; cursor?: string | null } = {}) =>
    apiClient.get<BlockListPage>('/api/v1/blocks', {
      query: {
        limit: params.limit ?? 50,
        cursor: params.cursor ?? undefined,
      },
    }),

  block: (input: BlockUserInput) =>
    apiClient.post<BlockActionResult>('/api/v1/blocks', {
      body: {
        targetUserId: input.targetUserId,
        reason: input.reason,
      },
    }),

  unblock: (targetUserId: string) =>
    apiClient.delete<BlockActionResult>(`/api/v1/blocks/${targetUserId}`),
} as const;
