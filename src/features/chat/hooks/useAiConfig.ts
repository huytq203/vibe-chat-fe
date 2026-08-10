'use client';

import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/services/ai.api';
import { aiKeys } from '@/services/keys';

/** Model AI đang chạy ở backend — hiếm đổi nên cache dài, hỏng thì không retry. */
export function useAiConfig() {
  return useQuery({
    queryKey: aiKeys.config(),
    queryFn: aiApi.getConfig,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
