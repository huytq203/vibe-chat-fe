# TEMPLATE — Hook Mutation (`use-mutations.ts`)

```ts
// features/chat/hooks/use-mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/services/chat.api";
import { chatKeys } from "@/services/keys";
import type { SendMessageInput, ChatMessage } from "../types";

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => chatApi.create(input),

    // Optimistic update
    onMutate: async (input) => {
      const key = chatKeys.list({ conversationId });
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ChatMessage[]>(key);
      queryClient.setQueryData<ChatMessage[]>(key, (old = []) => [
        ...old,
        { id: "temp", content: input.content, pending: true } as ChatMessage,
      ]);
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.prev); // rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list({ conversationId }) });
    },
  });
}
```

## Nhắc
- Invalidate **đúng key, hẹp** (`chatKeys.list(...)`), không vung rộng.
- Optimistic: `onMutate` (snapshot + cập nhật) → `onError` (rollback) → `onSettled` (đồng bộ lại).
- Side-effect khác (toast, đóng modal) đặt ở component qua `mutate(..., { onSuccess })`, không nhét vào hook.
