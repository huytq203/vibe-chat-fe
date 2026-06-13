# TEMPLATE — Hook Query (`use-query.ts`)

```ts
// features/chat/hooks/use-query.ts
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { chatApi } from "@/services/chat.api";
import { chatKeys } from "@/services/keys";
import type { ChatFilters } from "../types";

export function useMessages(filters: ChatFilters) {
  return useQuery({
    queryKey: chatKeys.list(filters),
    queryFn: () => chatApi.getMessages(filters),
    staleTime: 60_000,
  });
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: chatKeys.detail(id),
    queryFn: () => chatApi.getMessage(id),
    enabled: Boolean(id),
  });
}

export function useInfiniteMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.list({ conversationId }),
    queryFn: ({ pageParam }) => chatApi.getMessages({ conversationId, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
```

## Nhắc
- API từ `@/services/*.api.ts`, key từ `@/services/keys`.
- KHÔNG `useEffect+fetch`. `enabled` để chặn fetch khi thiếu param.
- Override `staleTime`/`retry` theo nhu cầu; mặc định từ `lib/query/client.ts`.
