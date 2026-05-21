import { apiClient } from '@/lib/api/client';
import type { UserSearchPage } from '@/features/friends/types';

export const usersApi = {
  search: async (params: {
    q: string;
    limit?: number;
    cursor?: string | null;
  }): Promise<UserSearchPage> => {
    return apiClient.get<UserSearchPage>('/api/v1/users/search', {
      query: {
        q: params.q,
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
    });
  },
} as const;
