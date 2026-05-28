import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient factory — defaults áp dụng toàn dự án.
 * Override per-query khi cần (vd realtime → staleTime: 0).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
