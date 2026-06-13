# PATTERN — Forms (React Hook Form + Zod)

> Schema-first. Zod schema đặt ở `features/<x>/schemas.ts`, **share cho client + server action**.

## Schema → type
```ts
// features/chat/schemas.ts
import { z } from "zod";
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1, "Không được để trống").max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
```

## Form client
```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendMessageSchema, type SendMessageInput } from "../schemas";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const form = useForm<SendMessageInput>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: { conversationId, content: "" },
  });

  async function onSubmit(values: SendMessageInput) {
    const res = await sendMessage(values); // server action → Result Object
    if (!res.success) {
      // toast lỗi (Basuicn) — KHÔNG hiện raw error
      return;
    }
    form.reset({ conversationId, content: "" });
  }
  // ...render với <Form> Basuicn, FormMessage cho lỗi inline
}
```

## Quy tắc
- `zodResolver` từ `@hookform/resolvers/zod`.
- Submit qua **Server Action** trả `{ success: true, data } | { success: false, error }`.
- Server **validate lại** bằng cùng schema (không tin client).
- Lỗi: toast hoặc `<FormMessage>` inline.
- Form phức tạp (multi-step, dynamic field) → tách `useXxxForm` hook trong `features/<x>/hooks/`.
