# Bàn giao — AI đọc/ghi được ghi chú (dừng 2026-09-09)

## Đang ở đâu

Toàn bộ **backend đã khép kín và chạy thật**. Còn lại là FE.

```
FE  →  POST /api/v1/ai/notion/chat[/stream]   (workspaceId, pageId?, messages)
       ↓ OwnerJwtGuard → owner.ownerId
       ↓ NotionToolsFactory.create({ userId, workspaceId })
       ↓ CompletionsService  feature:'notion'  → prompt notion
       ↓ provider.streamTools()  → SSE: delta / tool / done
              ↓ 4 tool → notion-service /api/v1/internal/ai/*
                         X-Internal-Api-Secret + userId trong body
                     search_pages · read_page · create_page · write_page_content
                            ↓ POST internal/ai/pages/content
                            ↓ có người mở? → 409 → model in Markdown ra (đường A)
                            ↓ không ai mở? → snapshot BEFORE_AI → mutateDocument (đường B)
```

| Giai đoạn | Repo | Trạng thái |
|---|---|---|
| P1 — endpoint ghi nội dung Y.Doc | notion-service | ✅ |
| P1b — `streamTools` 3 adapter + SSE `tool` | ai-service | ✅ |
| P2 — module `notion-tools` + `/ai/notion/chat` | ai-service | ✅ |
| P2b — bề mặt `internal/ai` + guard secret | cả hai | ✅ |
| P3/P4 — tab AI trong bảng bên | vibe-chat-fe | ⏳ Task 1/6 xong |
| P5 — viết lại/chuẩn hoá khối đang chọn | vibe-chat-fe | ⬜ chưa lập plan |
| P6 — tạo trang mới bằng AI | vibe-chat-fe | ⬜ chưa lập plan |

### Mốc test hiện tại

| Repo | Test | tsc |
|---|---|---|
| notion-service | 132/132, 27 suite | **sạch tuyệt đối** |
| ai-service | 251/251, 36 suite | **đúng 6 file baseline** (xem plan) |
| vibe-chat-fe | 177/177, 35 suite | sạch |

### Kiểm chứng liên thông đã làm (không mock)

```
POST localhost:8080/api/v1/internal/ai/search
  không secret        → 401 UNAUTHORIZED       (guard chặn)
  có secret, user giả → 403 WORKSPACE_FORBIDDEN (quyền chặn)
```

403 là bằng chứng quan trọng nhất: secret chỉ mở cửa **service**, không mở cửa **dữ liệu**. `AuthUser` dựng từ `dto.userId` thật sự chảy tới `PagesService` và bị kiểm quyền như người dùng thường.

---

## Mai làm gì — Task 2 của plan FE

**Plan:** `docs/superpowers/plans/2026-09-08-notes-ai-panel.md` (6 task, Task 1 đã xong)

Thứ tự còn lại:

2. Tham số hoá đường truyền của `useAiConversation` (thêm `stream?`, `onTool?`)
3. `src/services/notion-ai.api.ts` — transport `/ai/notion/chat/stream`
4. `useNoteAiSession(pageId)` — `AiSessionActions` trong bộ nhớ
5. `AiTab.tsx` — ráp khung hội thoại, 4 trạng thái, nhãn công cụ
6. Thêm tab `'ai'` vào store + `SidePanel`

Task 1 đã tạo `src/features/ai/` gồm: `types.ts`, `index.ts`, `hooks/useAiConversation.ts`, `components/{AiMessageList,AiMessageRow,AiMessageContent,AiChatInput,AiAttachmentTray}.tsx`.

---

## Việc phải làm trước khi deploy

- [ ] **`.env` production trên Dokploy** vẫn là `NOTION_SERVICE_INTERNAL_BASE_URL=http://notion.halotech.io.vn/api/v1`. Tên miền này phân giải ra Cloudflare (104.21.31.113 / 172.67.176.63) → **công khai**, và `http://` nên secret đi qua Internet không mã hoá. Đổi sang `http://notion-service:8080/api/v1` (local đã đổi rồi).
- [ ] **Chặn `/api/v1/internal/*` ở Cloudflare/ingress** — phòng khi sau này ai đó trỏ lại ra ngoài.
- [ ] **Chưa commit gì** ở cả 3 repo. Repo FE đang trộn việc của phiên AI với việc phiên song song (`shiki`, `code-highlighting`, `PublicPageBody`) — cần tách commit thủ công.
- [ ] Chạy migration `20260908000000_version_kind_before_ai` của notion-service trên production.

## Nợ kỹ thuật đã ghi nhận

- **Khung SSE có hai bản sao** (`CompletionsController` và `NotionChatController`). Mẹo "kéo mẩu đầu trước khi ghi header" — chỗ duy nhất còn đổi được HTTP status cho 422/429/503 — rất dễ bị làm hỏng ở một bản mà người sửa không biết bản kia tồn tại.
- **Chưa có lớp service-account JWT** cho internal API. `vibe-chat` dùng *hai* lớp (secret + service-account JWT role `BOT_GATEWAY`); notion-service hiện chỉ có secret. Đây là bước siết tiếp theo đáng làm, cần dựng realm bên Keycloak.
- **`shiki` được thêm vào `package.json`** (từ phiên song song) nhưng không có trong bảng tech stack §2 của `.claude/CLAUDE.md`, mà rule ghi "thêm lib ngoài bảng → dừng, hỏi user".

## Bẫy môi trường

- **`next dev` ngốn ~4GB và giết task của Codex.** Đã làm hỏng 3 lượt chạy. Next 16 dùng Turbopack (Rust) nên `--max-old-space-size=2048` **không có tác dụng** — cờ đó chỉ chặn old space của V8. Tắt dev server trước khi giao task cho Codex, hoặc dùng `next dev --webpack`.
- **Codex CLI hết hạn mức lúc ~02:00, mở lại 03:07 sáng.**
- Lệnh test: `ai-service` và `notion-service` **bắt buộc** `NODE_OPTIONS=--experimental-vm-modules` (script `npm test` đã set; gọi `npx jest` trần sẽ vỡ ở `jwks-rsa`).
- Sandbox của Codex không có database → suite đụng Prisma fail vì `$connect()`. Hạn chế môi trường, không phải lỗi code.

## Tài liệu

| File | Nội dung |
|---|---|
| `ai-service/docs/superpowers/specs/2026-09-08-notion-ai-design.md` | R1–R7 ràng buộc, D1–D7 quyết định thiết kế |
| `ai-service/docs/superpowers/plans/2026-09-08-stream-tools.md` | P1b — đã xong |
| `ai-service/docs/superpowers/plans/2026-09-08-notion-tools.md` | P2 — đã xong |
| `ai-service/docs/superpowers/plans/2026-09-09-notion-internal-api.md` | P2b — đã xong |
| `vibe-chat-fe/docs/superpowers/plans/2026-09-08-notes-ai-panel.md` | P3+P4 — Task 1/6 |
