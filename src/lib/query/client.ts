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
        // gcTime mặc định vừa phải (30 phút) cho query phụ. Riêng messages giữ
        // lâu hơn (xem useMessages) để rời conversation lâu vẫn không reload.
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
