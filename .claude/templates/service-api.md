# TEMPLATE — Service API transport (`services/<scope>.api.ts`)

> Transport thuần REST. KHÔNG đụng TanStack/Zustand/cache/state. Gọi qua wrapper `lib/http`.

```ts
// src/services/chat.api.ts
import { httpClient } from "@/lib/http/client";
import { chatMessageSchema } from "@/features/chat/schemas";
import type {
  ChatFilters,
  ChatMessage,
  SendMessageInput,
} from "@/features/chat/types";

export const chatApi = {
  getMessages: (filters: ChatFilters): Promise<{ items: ChatMessage[]; nextCursor?: string }> =>
    httpClient.get("/messages", { params: filters }),

  getMessage: async (id: string): Promise<ChatMessage> => {
    const raw = await httpClient.get(`/messages/${id}`);
    return chatMessageSchema.parse(raw); // validate nguồn không tin cậy
  },

  create: (input: SendMessageInput): Promise<ChatMessage> =>
    httpClient.post("/messages", input),
};
```

## Nhắc
- Mỗi scope export 1 object thuần (`chatApi`, `authApi`…).
- Được phép import **types/schemas** từ feature (transport thuộc domain feature).
- Validate response bằng Zod khi nguồn không chắc chắn.
- KHÔNG fetch trực tiếp trong component/hook — luôn qua object này.
- KHÔNG dùng `axios` trực tiếp — đi qua `@/lib/http`.
