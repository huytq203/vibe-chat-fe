# 01 — TypeScript & Type Safety

## Cấm tuyệt đối
- `any` → dùng `unknown` rồi narrow, hoặc generic.
- `@ts-ignore`, `@ts-expect-error` (trừ khi có comment giải thích rõ lý do + ticket).
- `as` tuỳ tiện → chỉ assertion sau khi đã narrow; ưu tiên type guard.

## Quy tắc
- Strict mode bật toàn bộ (`strict: true`). Không tắt từng cờ.
- **Type cho props**: `XxxProps`, đặt ngay trên component. Không prefix `I` cho interface.
- Ưu tiên `type` cho union/intersection, `interface` cho object có thể mở rộng.
- Enum → dùng `as const` object + union type thay cho `enum`:
  ```ts
  export const MessageStatus = { SENT: "sent", READ: "read" } as const;
  export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
  ```
- Hàm public **luôn có kiểu trả về tường minh**. Hàm nội bộ nhỏ có thể để TS suy luận.
- Tránh kiểu lặp lại → derive bằng utility types (`Pick`, `Omit`, `Parameters`, `ReturnType`, `z.infer`).
- Type domain đặt ở `features/<x>/types.ts`. Type dùng chung toàn dự án ở `src/types/`.
- **Zod là nguồn sự thật type cho data có I/O**: định nghĩa schema → `type X = z.infer<typeof xSchema>`. Không viết type tay rồi lại viết schema riêng.

## Narrowing thay vì ép kiểu
```ts
// ❌
const data = res as ChatMessage;
// ✅
const data = chatMessageSchema.parse(res); // validate + infer type
```
