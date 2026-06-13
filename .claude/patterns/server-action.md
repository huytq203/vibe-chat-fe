# PATTERN — Server Action

> Mọi mutate server-side: validate Zod + check AuthZ + trả Result Object + revalidate cache.

```ts
// features/chat/actions/send-message.ts
"use server";
import { sendMessageSchema } from "../schemas";
import { getSession } from "@/lib/auth";
import { revalidateTag } from "next/cache";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function sendMessage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { success: false, error: "UNAUTHORIZED" };

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };

  try {
    const message = await chatApi.create(parsed.data); // qua transport/service
    revalidateTag("chat-messages"); // hoặc revalidatePath(...)
    return { success: true, data: { id: message.id } };
  } catch {
    return { success: false, error: "INTERNAL_ERROR" }; // KHÔNG leak raw error
  }
}
```

## Quy tắc
- `"use server"` ở đầu file action.
- Input kiểu `unknown` → `safeParse` (cùng schema client dùng).
- Check session + permission **trong** action.
- Trả Result Object — error là mã/chuỗi an toàn, không stack/PII.
- Cập nhật cache: `revalidatePath`/`revalidateTag` (Server) hoặc client invalidate qua `useMutation.onSuccess`.
- Action đặt ở `features/<x>/actions/`, đặt tên động từ rõ nghĩa (`sendMessage`, không `send`).
