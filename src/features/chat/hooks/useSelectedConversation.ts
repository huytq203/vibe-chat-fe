'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

export function useSelectedConversation() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const selectedConversationId = params.id ?? null;

  const setSelected = useCallback(
    (id: string | null) => {
      router.replace(id ? `/chat/${id}` : '/chat', { scroll: false });
    },
    [router],
  );

  return { selectedConversationId, setSelected };
}
