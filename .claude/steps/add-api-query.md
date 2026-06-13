# STEP — Thêm endpoint + hook Query/Mutation

> Mọi transport tập trung ở `src/services/`. Hook ở `features/<x>/hooks/`.

1. **Định nghĩa/đảm bảo type** request & response ở `features/<x>/types.ts` (hoặc `z.infer` từ schema).
2. **Transport** — thêm hàm vào `src/services/<scope>.api.ts` (object thuần, ví dụ `chatApi.getMessages`). Gọi qua wrapper `src/lib/http` (hoặc `lib/api`). KHÔNG dính TanStack/Zustand/state. Mẫu: [../templates/service-api.md](../templates/service-api.md).
3. **Query key** — thêm vào factory trong `src/services/keys.ts` (`chatKeys.list(filters)`…). KHÔNG hard-code string. Xem [../patterns/query-keys.md](../patterns/query-keys.md).
4. **Hook**:
   - Đọc → `features/<x>/hooks/use-query.ts` (`useQuery`/`useInfiniteQuery`). Mẫu [../templates/hook-query.md](../templates/hook-query.md).
   - Ghi → `features/<x>/hooks/use-mutations.ts` (`useMutation` + invalidate đúng key). Mẫu [../templates/hook-mutation.md](../templates/hook-mutation.md).
5. **Validate response** (nếu nguồn không tin cậy) bằng Zod `safeParse` trong transport.
6. **Mutation**: invalidate đúng key, cân nhắc optimistic (`onMutate` + rollback).
7. **Server-side fetch** (initial render) → fetch trực tiếp trong Server Component hoặc Hydration ([../patterns/data-fetching.md](../patterns/data-fetching.md)).
8. **Test**: mock bằng MSW ở `test/mocks/`, KHÔNG mock `fetch` thủ công.

## Checklist nhanh
- [ ] Transport ở `services/`, không ở feature.
- [ ] Key có factory, không hard-code.
- [ ] Hook không `useEffect+fetch`.
- [ ] Mutation invalidate hẹp, đúng key.
