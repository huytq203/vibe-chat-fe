'use client';

import { useQuery } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys } from '@/services/keys';

/** Danh sách bot của owner hiện tại (trang đơn giản, không infinite-scroll). */
export function useBots(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: botKeys.list(params.page, params.limit),
    queryFn: () => botsApi.list(params),
  });
}
