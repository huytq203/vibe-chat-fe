# 05 — Security

## Bắt buộc
1. **Secrets** chỉ ở server (`.env.local`/`.env.production`). Tiền tố `NEXT_PUBLIC_` = lộ client → cân nhắc kỹ.
2. **Validate env**: `src/config/env.ts` parse `process.env` bằng Zod, throw nếu thiếu.
3. **Input từ client**: Zod-validate ở server (route handler / server action) **trước khi** xử lý. Không tin client.
4. **AuthZ trên server**: mọi route handler / server action kiểm tra session + permission.
5. **Output**: React tự escape JSX. `dangerouslySetInnerHTML` chỉ khi sanitize `dompurify` + comment.
6. **CSRF**: ưu tiên Server Actions (built-in). Route handler → token.
7. **CSP**: cấu hình `next.config.ts` `headers()` (CSP, X-Frame-Options, Referrer-Policy).
8. **Logging**: KHÔNG log token/password/PII. Qua `src/lib/logger`.
9. **Rate limit**: route public → giới hạn theo ip + user (`src/lib/rate-limit`).
10. **Dependency**: PR pass `npm audit` (no high/critical). Lib < 1k weekly downloads → hỏi user.

## Server Action — khung an toàn
```ts
"use server";
export async function createMessage(input: unknown) {
  const session = await getSession();
  if (!session) return { success: false, error: "UNAUTHORIZED" };
  const parsed = createMessageSchema.safeParse(input); // Zod
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  // ... xử lý, KHÔNG leak raw error
  return { success: true, data };
}
```

## Cấm
- Lộ logic nhạy cảm / API key / câu gọi DB ra client.
- Tin validation phía client.
- Ghép chuỗi SQL thô (dùng Prisma parameterized).
