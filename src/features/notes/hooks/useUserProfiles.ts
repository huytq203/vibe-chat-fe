'use client';

import { useQueries } from '@tanstack/react-query';
import type { UserProfile } from '@/features/friends';
import { userKeys } from '@/services/keys';
import { usersApi } from '@/services/users.api';

/**
 * Tra tên/avatar cho người được cấp quyền nhưng KHÔNG nằm trong danh sách thành viên
 * workspace (chia sẻ được cho mọi user trong Halo) — nếu không hàng chỉ hiện userId.
 */
export function useUserProfiles(userIds: string[]): Map<string, UserProfile> {
  const results = useQueries({
    queries: userIds.map((id) => ({
      queryKey: userKeys.profile(id),
      queryFn: () => usersApi.getProfile(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  return new Map(results.flatMap((result, index) => {
    const id = userIds[index];
    return result.data && id ? ([[id, result.data]] as const) : [];
  }));
}
