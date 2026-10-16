# Hybrid TanStack Query pattern

Dùng khi initial render cần dữ liệu và Client Component phải tiếp tục refetch, filter, pagination, mutation hoặc đồng bộ cache.

```text
Server Component → request-scoped QueryClient → prefetchQuery → dehydrate
→ HydrationBoundary → cùng queryOptions/query key ở Client Component
→ TanStack Query quản lý browser cache
```

## Shared query contract

```ts
import { queryOptions } from '@tanstack/react-query';

export const transactionQueries = {
  list: (filters: TransactionFilters) =>
    queryOptions({
      queryKey: ['transactions', filters] as const,
      queryFn: () => fetchTransactionsFromRoute(filters),
      staleTime: 30_000,
    }),
};
```

`fetchTransactionsFromRoute` phải là browser-safe query function. Filters phải được normalize và chứa mọi input ảnh hưởng response. URL search params là nguồn sự thật cho filter/sort/pagination có thể chia sẻ hoặc bookmark.

## Server hydration

```tsx
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

export default async function Page({ searchParams }: PageProps) {
  const filters = parseTransactionFilters(await searchParams);
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    ...transactionQueries.list(filters),
    queryFn: () => getTransactionsOnServer(filters),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionTable filters={filters} />
    </HydrationBoundary>
  );
}
```

Mỗi server render/request tạo QueryClient riêng. Server override `queryFn` để gọi data function trực tiếp, không tự gọi Route Handler nội bộ. Với streaming pending queries, chỉ dùng pattern được tài liệu Next.js/TanStack hiện hành hỗ trợ và đặt dưới Suspense.

## Client ownership

```tsx
'use client';

export function TransactionTable({ filters }: Props) {
  const query = useQuery(transactionQueries.list(filters));
  return <TransactionTableView rows={query.data.items} />;
}
```

Browser phải dùng một QueryClient ổn định từ provider. Server và client import cùng query contract. `staleTime` phải phản ánh freshness thực tế và ngăn immediate refetch ngoài chủ đích.

## Mutation coordination

- Optimistic update khi outcome có thể dự đoán và rollback rõ.
- Invalidate/update query key nhỏ nhất bị ảnh hưởng.
- Nếu server data được cache, mutation đồng thời invalidate tag/path tương ứng.
- Browser cache và server cache có lifetime riêng; xác định owner của từng invalidation.

## Không dùng Hybrid khi

- Server output chỉ đọc và không cần browser refetch/mutation.
- Dữ liệu chỉ cần sau interaction; dùng Client-only query.
- Hydration payload quá lớn so với giá trị first render.

## Helper trong repo

- `src/lib/query/query-client.ts` — `makeQueryClient()` dùng chung cho browser provider và request-scoped client ở server.
- `src/lib/query/prefetch.ts` — `prefetchDehydrated(prefetch)` tạo client riêng cho request và trả state cho `HydrationBoundary`; `unwrapOrRedirect(result)` dùng trong `queryFn` override ở server: 401 chuyển tới `/api/v1/admin/auth/session-expired`, lỗi khác ném `Error(code)` để client refetch.
- Ví dụ kiểm thử luồng Server → Hydration → Query: `src/lib/query/hybrid.integration.test.tsx`.

## Cấm

- Không dùng manual `initialData` và `HydrationBoundary` cho cùng query.
- Không hydrate secret hoặc dữ liệu private không cần ở client.
- Không tạo query key khác nhau giữa server và client.
- Không để `staleTime` mặc định gây duplicate refetch mà chưa có chủ đích.
- Không prefetch toàn dataset khi viewport chỉ cần một page.
