# TEMPLATE — Server Action

> Xem giải thích đầy đủ: [../patterns/server-action.md](../patterns/server-action.md).

```ts
// features/chat/actions/create-conversation.ts
"use server";
import { revalidateTag } from "next/cache";
import { createConversationSchema } from "../schemas";
import { getSession } from "@/lib/auth";
import { chatApi } from "@/services/chat.api";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createConversation(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { success: false, error: "UNAUTHORIZED" };

  const parsed = createConversationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };

  try {
    const conv = await chatApi.createConversation(parsed.data, session.accessToken);
    revalidateTag("conversations");
    return { success: true, data: { id: conv.id } };
  } catch {
    return { success: false, error: "INTERNAL_ERROR" };
  }
}
```

## Nhắc
- `"use server"` đầu file · input `unknown` → `safeParse` · check session/permission trong action.
- Trả Result Object, không leak raw error/PII · `revalidateTag`/`revalidatePath` sau khi mutate.
- Tên action = động từ rõ nghĩa.
