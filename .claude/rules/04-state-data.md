# 04 — State & Data Fetching

## Chọn loại state (quyết định nhanh)
| State | Dùng |
| ----- | ---- |
| Server data (list, detail) | **TanStack Query** |
| Form state | React Hook Form |
| UI cục bộ (modal open, input) | `useState` |
| Phức tạp trong 1 component | `useReducer` |
| Chia sẻ, ít đổi (theme, locale) | Context |
| Global đổi nhiều | **Zustand slice** |
| URL state (filter, tab, search) | `useSearchParams` — KHÔNG dup vào state |

## TanStack Query (server state)
- **Mọi fetch client-side qua `useQuery`/`useMutation`.** CẤM `useEffect + fetch`.
- Hook sống ở `features/<x>/hooks/use-query.ts` & `use-mutations.ts`.
- Gọi API qua `src/services/<scope>.api.ts`; key từ `src/services/keys.ts` (factory) → [../patterns/query-keys.md](../patterns/query-keys.md).
- `QueryClient` config tập trung `src/lib/query/client.ts`. Default: `staleTime: 60_000`, `retry: 1`.
- Mutation **invalidate đúng key**, tránh `invalidateQueries(['all'])`.
- Optimistic UI → `onMutate` + rollback `onError`.
- Server Component **không** dùng TanStack Query — fetch trực tiếp hoặc Server Action. Cần prefetch → Hydration (`prefetchQuery` + `HydrationBoundary`) → [../patterns/data-fetching.md](../patterns/data-fetching.md).

## Zustand (slice pattern)
- Mỗi feature 1 store riêng (`features/<x>/stores/<name>.store.ts`). KHÔNG store "god".
- Chỉ cho state **thực sự global, đổi nhiều**. Còn lại dùng `useState`/`useReducer`.
- Không khởi tạo store global bằng data server ở root client mà không qua Hydration.

## Realtime
- Qua wrapper `src/lib/ws/`. Feature không import socket.io trực tiếp.
- Cập nhật cache Query từ event realtime bằng `queryClient.setQueryData` đúng key.
