'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Active AI session id lấy từ route /ai/[id] để sống sót khi refresh (giống /chat/[id]). */
export function useSelectedAiSession() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeId = params.id ?? null;

  const setActiveId = useCallback(
    (id: string | null) => {
      router.replace(id ? `/ai/${id}` : '/ai', { scroll: false });
    },
    [router],
  );

  return { activeId, setActiveId };
}
