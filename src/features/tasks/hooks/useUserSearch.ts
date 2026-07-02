'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

/** Tìm user trong directory để mời vào project. Chỉ chạy khi query ≥ 2 ký tự. */
export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ['tasks', 'user-search', q],
    queryFn: () => tasksApi.searchUsers(q),
    enabled: q.trim().length >= 2,
    // Giữ kết quả cũ khi gõ tiếp để dropdown không nháy (v5 thay cho keepPreviousData)
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
