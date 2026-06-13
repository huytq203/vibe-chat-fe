# 06 — Naming & Structure

## Đặt tên
| Loại | Quy ước | Ví dụ |
| ---- | ------- | ----- |
| File component | `PascalCase.tsx` | `ChatMessage.tsx` |
| Hook đơn (1 hook) | `useCamelCase.ts` | `useChatRealtime.ts` |
| Hook aggregator | `use-<kind>.ts` | `use-query.ts`, `use-mutations.ts` |
| Util/helper | `kebab-case.ts` | `format-date.ts` |
| Folder | `kebab-case` | `chat-history/` |
| Type/Interface | `PascalCase`, không `I` | `ChatMessage` |
| Props type | `XxxProps` | `ChatMessageProps` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_MESSAGE_LENGTH` |
| Zod schema | `xxxSchema` | `chatMessageSchema` |
| Boolean | `is/has/can/should` | `isLoading`, `hasError` |
| Handler | `handleXxx` (trong), `onXxx` (prop) | `handleClick`, `onSubmit` |
| Action | động từ rõ nghĩa | `createMessage` (không `create`) |

## Cấu trúc thư mục (tóm tắt — chi tiết `CLAUDE.md §2` cũ / `Workflow/`)
```
src/
├── app/            # routes; _components/ cho component riêng route
├── features/<x>/   # components/ hooks/ actions/ stores/ schemas.ts types.ts utils.ts index.ts
├── services/       # <scope>.api.ts (transport) + keys.ts (query keys) — TẬP TRUNG
├── components/     # ui/ (Basuicn) · layout/ · common/
├── lib/            # wrapper lib bên thứ ba: api/ http/ query/ ws/ logger/ utils/
├── config/         # env.ts (Zod) · site.ts
├── styles/         # globals.css
├── types/          # type chung toàn dự án
└── test/           # mocks, fixtures
```

## Nguyên tắc
- **Feature = bounded context kinh doanh** (chat, auth…), KHÔNG tách theo technical layer.
- **Colocation**: file liên quan ở cạnh nhau. Promote lên dùng chung khi ≥ 2 feature dùng.
- **Max depth 3.** Flat > nested.
- Feature giao tiếp **chỉ qua `index.ts`** (export tường minh, KHÔNG `export *`). Cấm import sâu vào internal feature khác.
- Import dùng alias `@/...`, không relative dài (`../../../`).

## Cấm
- Tạo `features/<x>/api/` — API + keys ở `src/services/`.
- `export *` từ barrel.
- File > 300 dòng chưa tách. Dead code / `_keepAlive` "phòng tương lai" → xoá.
