# BotFather Integration — Quản lý Bot trong FE

**Date:** 2026-07-12
**Status:** Approved
**Scope:** BE (`bot-service`, 1 endpoint mới) + FE (`vibe-chat-fe`)
**Bối cảnh:** `bot-service` đã có sẵn Management API (đóng vai trò "BotFather" kiểu Telegram — tạo bot, cấp/thu hồi token) dùng chung Keycloak JWT với vibe-chat. Spec này ghép UI quản lý bot vào FE.

---

## 1. Quyết định

| Câu hỏi | Quyết định |
|---|---|
| Token listing | Thêm `GET /api/v1/bots/:botId/tokens` ở bot-service (chưa có) — cần để hiển thị danh sách token đang có |
| Vị trí UI | Tab mới "Bot của tôi" trong `SettingsModal` (cạnh tab "Thiết bị đăng nhập") |
| Kết nối bot-service | Mở rộng `apiClient` có sẵn (`src/lib/api/client.ts`) — KHÔNG viết client riêng như task-service, vì envelope response của bot-service khớp 100% với `ApiEnvelope`/`ApiErrorBody` đã định nghĩa |
| Auth | Dùng chung JWT Keycloak hiện tại của user (owner-authenticated `OwnerJwtGuard` bên bot-service) — không cần login riêng |
| Form pattern | RHF + Zod client-side, submit qua TanStack `useMutation` gọi thẳng `*.api.ts` — KHÔNG qua Server Action (theo precedent thật `ProfileDialog.tsx`, `DevicesTab.tsx`, không theo literal `patterns/forms-zod.md`) |
| Test | Vitest cho toàn bộ flow (mock `*.api.ts` + `@/config/env`, đúng convention thật đang dùng — KHÔNG dùng MSW dù có trong `package.json`, vì codebase hiện chưa dùng MSW thật ở đâu); Playwright chỉ 1 spec critical-path, chạy trên backend thật (đúng convention `e2e/login-send-message.spec.ts`) |

---

## 2. Backend — `bot-service` (1 endpoint mới)

### 2.1 `GET /api/v1/bots/:botId/tokens`

- Guard: `OwnerJwtGuard` (đã có) + ownership check qua `BotsService.findOwnedActiveBotOrFail` (pattern giống `BotTokensController` hiện tại).
- Response (`ResponseBotTokenListItemDto[]`, KHÔNG bao giờ trả `tokenHash`/plaintext):

```ts
{
  id: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
```

- Thêm `BotTokensRepository.findAllByBotId(botId)` + `BotTokensService.listTokens(ownerId, botId)` + method trong `BotTokensController` (`@Get()` trên route `bots/:botId/tokens` đã khai báo).
- Unit test: trả đúng danh sách, ownership check (bot của owner khác → 404), không lộ `tokenHash`.

Các endpoint còn lại (create/list/get/update/delete bot; issue/rotate/revoke token) đã tồn tại, dùng nguyên.

---

## 3. FE — Kết nối bot-service

### 3.1 `src/config/env.ts`
Thêm `NEXT_PUBLIC_BOT_URL: z.string().url()` (bắt buộc, theo pattern `NEXT_PUBLIC_TASK_URL`).

### 3.2 `next.config.ts`
Thêm `BOT_URL = process.env.BOT_URL || process.env.NEXT_PUBLIC_BOT_URL`; `unshift` 2 rewrite rule vào đầu mảng (chạy trước catch-all `/api/v1/:path*` → `VIBE_URL`):
```ts
{ source: '/api/v1/bots/:path*', destination: `${BOT_URL}/api/v1/bots/:path*` },
{ source: '/api/v1/bot/:path*', destination: `${BOT_URL}/api/v1/bot/:path*` },
```

### 3.3 `src/lib/api/client.ts`
Sửa `resolveBase()`:
```ts
function resolveBase(path: string): string {
  if (env.NEXT_PUBLIC_USE_PROXY) return '';
  if (path.startsWith('/api/v1/auth/')) return env.NEXT_PUBLIC_AUTH_URL;
  if (path.startsWith('/api/v1/bot')) return env.NEXT_PUBLIC_BOT_URL;
  return env.NEXT_PUBLIC_VIBE_URL;
}
```
Toàn bộ logic refresh-token / 401-retry / `parseError` / unwrap envelope tái dùng nguyên vẹn.

---

## 4. FE — Cấu trúc feature

```
src/services/
├── bots.api.ts             # CRUD bot
└── bot-tokens.api.ts        # issue/list/rotate/revoke token
src/services/keys.ts          # + botKeys, botTokenKeys

src/features/bots/
├── components/
│   ├── BotsTab.tsx              # gắn vào SettingsModal — list + 4 trạng thái
│   ├── BotRow.tsx
│   ├── CreateBotDialog.tsx      # bước 1 form → bước 2 TokenRevealCard
│   ├── EditBotDialog.tsx
│   ├── DeleteBotAlertDialog.tsx
│   ├── BotTokensPanel.tsx       # list token của 1 bot
│   ├── TokenRow.tsx
│   ├── IssueTokenDialog.tsx     # chọn scopes + hạn dùng
│   └── TokenRevealCard.tsx      # dùng chung — hiện plaintext 1 lần
├── hooks/
│   ├── use-query.ts         # useBots(query), useBotTokens(botId)
│   └── use-mutations.ts     # useCreateBot/useUpdateBot/useDeleteBot/useIssueToken/useRotateToken/useRevokeToken
├── schemas.ts                # createBotSchema, updateBotSchema, issueTokenSchema
├── types.ts                  # Bot, BotCreated, BotToken, BotTokenListItem, BotTokenScope, BotListPage
├── utils.ts                  # format scope label, format hạn dùng/lần dùng cuối
└── index.ts
```

### 4.1 Zod schema (khớp DTO backend)
```ts
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
const USERNAME_CONTAINS_BOT = /bot/i;

export const createBotSchema = z.object({
  username: z.string().regex(USERNAME_PATTERN, '...').regex(USERNAME_CONTAINS_BOT, 'Username phải chứa "bot"'),
  displayName: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
});
export const updateBotSchema = createBotSchema.partial();
export const issueTokenSchema = z.object({
  scopes: z.array(z.enum(['messages:send', 'media:send', 'webhook:manage', 'commands:manage'])).optional(),
  expiresAt: z.string().datetime().optional(),
});
```

---

## 5. Luồng UI

- **Empty**: "Bạn chưa có bot nào" + nút **Tạo bot mới**.
- **Tạo bot**: `CreateBotDialog` bước 1 (form) → submit → bước 2 `TokenRevealCard` (plaintext + Copy + checkbox bắt buộc "Tôi đã lưu token này" mới cho đóng). Lỗi 409 `BOT_USERNAME_TAKEN` → `form.setError('username', ...)`; lỗi khác → toast.
- **List**: `BotRow` hiện username/displayName/badge status+provisioned, menu *Sửa* / *Quản lý token* / *Xoá*.
- **Sửa**: `EditBotDialog` (displayName/description) → PATCH → invalidate `botKeys.list()`.
- **Quản lý token**: `BotTokensPanel` (`GET /bots/:id/tokens` mới) — mỗi `TokenRow`: prefix, badge scope, ngày tạo, hạn dùng ("Không giới hạn" nếu null), lần dùng cuối ("Chưa dùng" nếu null), badge "Đã thu hồi" nếu có `revokedAt` (ẩn action). Actions: **Rotate** (AlertDialog cảnh báo token cũ ngừng hoạt động ngay → hiện `TokenRevealCard` token mới), **Revoke** (AlertDialog xác nhận). Nút riêng **Cấp token mới** (`IssueTokenDialog`: checkbox 4 scope + hạn dùng optional).
- **Xoá bot**: `DeleteBotAlertDialog` — cảnh báo "xoá sẽ thu hồi toàn bộ token, không hoàn tác".

---

## 6. Test

### 6.1 Vitest (đủ mọi flow — mock `*.api.ts` + `@/config/env`, KHÔNG MSW)
- `schemas.ts`: username phải chứa "bot", 3-32 ký tự, reject sai định dạng.
- `hooks/use-mutations.ts` + `use-query.ts`: mock api module, assert gọi đúng endpoint + đúng `queryKey` invalidate.
- Từng component (`CreateBotDialog`, `EditBotDialog`, `DeleteBotAlertDialog`, `BotsTab`, `BotTokensPanel`, `TokenRow`, `IssueTokenDialog`, `TokenRevealCard`): mock hook, test đủ 4 trạng thái (loading/error/empty/data) + edge case (lỗi 409, token đã thu hồi, chưa tick "đã lưu" thì không đóng dialog được).
- Backend: unit test `BotTokensService.listTokens` (ownership check, không lộ `tokenHash`).

### 6.2 Playwright (1 spec critical-path, `e2e/bots.spec.ts`, chạy trên backend thật)
Login → mở Settings → tab "Bot của tôi" → tạo bot (username có suffix `Date.now()` tránh trùng — theo pattern `login-send-message.spec.ts`) → thấy token hiện 1 lần → đóng → bot xuất hiện trong list → mở quản lý token → rotate → revoke.

---

## 7. Definition of Done

- [ ] `GET /bots/:botId/tokens` bên bot-service: có test, lint, build pass, tuân `rules/` bot-service.
- [ ] FE: `tsc --noEmit` + `npm run lint` pass.
- [ ] Đủ 4 trạng thái UI cho mọi màn hình hiển thị data từ API.
- [ ] Vitest cho toàn bộ hook + component liệt kê ở mục 6.1, pass 100%.
- [ ] Playwright spec ở mục 6.2 pass.
- [ ] Không secret/token log ra console; token plaintext chỉ hiện đúng 1 lần trong `TokenRevealCard`, không lưu vào state ngoài phạm vi dialog đó.
