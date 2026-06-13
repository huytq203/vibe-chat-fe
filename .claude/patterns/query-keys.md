# PATTERN — Query keys (factory tập trung)

> Tất cả key factory ở `src/services/keys.ts` theo namespace. KHÔNG tách `features/<x>/api/keys.ts`. KHÔNG hard-code string.

## Factory
```ts
// src/services/keys.ts
import type { ChatFilters } from "@/features/chat/types";

export const chatKeys = {
  all: ["chat"] as const,
  lists: () => [...chatKeys.all, "list"] as const,
  list: (filters: ChatFilters) => [...chatKeys.lists(), filters] as const,
  details: () => [...chatKeys.all, "detail"] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};
```

## Dùng trong hook
```ts
useQuery({ queryKey: chatKeys.list(filters), queryFn: () => chatApi.getMessages(filters) });
```

## Invalidate hẹp
```ts
// ✅ chỉ invalidate list của chat
queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
// ❌ vung chổi rộng
queryClient.invalidateQueries(); // CẤM
```

## Quy tắc
- Phân tầng `all → lists → list(filters) → detail(id)` để invalidate chính xác theo nhánh.
- Filter object đưa nguyên vào key (Query tự so sánh structural).
- Thêm scope mới → thêm 1 object factory mới, không trộn vào scope khác.
