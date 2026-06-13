# PATTERN — Data fetching (Server vs Client + Hydration)

## Quyết định nhanh
| Kịch bản | Cách |
| -------- | ---- |
| SEO / public page | Server Component + `fetch` (cache Next 16) |
| Realtime / interactive | Client Component + TanStack Query |
| Form submit | Server Action **hoặc** Route Handler + `useMutation` |
| Mutate + optimistic | `useMutation` với `onMutate` |
| Streaming (chat) | Server Action streaming / Route Handler trả `ReadableStream` |

## Nguyên tắc
- Default Server Component. `'use client'` ở component lá nhỏ nhất.
- Truyền data Server → Client qua **props đã serialize** (không function/class).
- Tránh waterfall: fetch song song `Promise.all` trong Server Component.
- Server Component **không** dùng TanStack Query.

## Hydration (prefetch trên server, dùng cache ở client)
```tsx
// app/(app)/chat/page.tsx — Server Component
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/server";
import { chatKeys } from "@/services/keys";
import { chatApi } from "@/services/chat.api";

export default async function ChatPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: chatKeys.list({}),
    queryFn: () => chatApi.getMessages({}),
  });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MessageList /> {/* client component dùng useQuery cùng key → không refetch */}
    </HydrationBoundary>
  );
}
```

## Tránh
- `typeof window !== 'undefined'` để render khác lúc đầu (Hydration Mismatch). Cần browser API → `useEffect` / `dynamic(..., { ssr:false })`.
- Khởi tạo Zustand bằng data server ở root client mà không qua Hydration.
