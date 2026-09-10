# Kế hoạch: AI đa trang, link kết quả tìm kiếm, history chung workspace

Ngày: 2026-09-10
Repo: `ai-service`, `notion-service`, `vibe-chat-fe`

## Hiện trạng đã khảo sát (không phải suy đoán)

- AI **đã có** khả năng đọc trang đang đóng: `search_pages` + `read_page` chạy trên toàn
  workspace. Cái neo nó vào trang đang mở là `notion-chat.controller.ts:139`:
  `text: "(Người dùng đang mở trang có pageId X.)"` — cộng với việc prompt không có quy tắc
  nào bảo nó chủ động tìm sang trang khác.
- `search_pages` trả `{ pageId, title, snippet }`. Route trang là `/notes/[workspaceId]/[pageId]`.
- `AiMessageContent.tsx:238` đã render thẻ `<a>` nhưng luôn `target="_blank"`.
- `AiConversation.pageId` hiện là `String` **bắt buộc**, index `[userId, pageId, updatedAt]`.
  Không có quan hệ khoá ngoại tới `Page`.
- `useAiPageChange(pageId)` chỉ theo dõi phiên bản của **trang đang mở**.

## Quyết định

**D1 — Công cụ tự dựng URL, AI không dựng.** `search_pages` trả thêm `url`. Factory đã có
`workspaceId` nên dựng được `/notes/${workspaceId}/${pageId}`. AI chỉ việc dùng lại chuỗi đó.
Lý do: AI không biết `workspaceId` (prompt cố tình giấu), để nó tự ghép URL là mời nó bịa.

**D2 — Link nội bộ điều hướng trong app.** Href bắt đầu bằng `/` thì dùng điều hướng nội bộ,
không `target="_blank"`. Link ngoài giữ nguyên `target="_blank" rel="noopener noreferrer"`.
Mở tab mới cho trang nội bộ sẽ tải lại toàn bộ app và mất trạng thái bảng bên.

**D3 — Hội thoại thuộc workspace, không thuộc trang.** Thêm `workspaceId String` (bắt buộc);
`pageId` thành `String?` với ý nghĩa mới là "trang lúc bắt đầu hội thoại", chỉ để tham khảo,
không dùng để lọc.

**D4 — Hội thoại mồ côi bị xoá khi migrate.** Backfill `workspaceId` từ `Page`. Dòng nào có
`pageId` trỏ tới trang không còn tồn tại thì không suy ra được workspace và sẽ không bao giờ
liệt kê được nữa, nên xoá. ĐÂY LÀ MẤT DỮ LIỆU — phải được người dùng xác nhận trước khi chạy.

**D5 — Đổi cách neo ngữ cảnh.** Câu tiêm vào phải nói rõ đây chỉ là ngữ cảnh, không phải giới hạn.

---

## Phần A — ai-service

### A1. `notion-tools.factory.ts`: `search_pages` trả thêm `url`

Chỗ `results.map(({ pageId, title, snippet }) => ({ pageId, title, snippet }))` thêm
`url: \`/notes/${workspaceId}/${pageId}\``. `workspaceId` đã có sẵn trong `createSearchTool`.

### A2. `notion-chat.controller.ts:136-141`: đổi câu neo ngữ cảnh

Thay bằng nội dung nói rõ: người dùng đang mở trang này, NHƯNG không bị giới hạn ở nó — cần
thông tin ở trang khác thì dùng `search_pages` rồi `read_page`.

### A3. `prompts/notion-system-prompt.md`

Thêm hai quy tắc:
- Khi câu hỏi nhắc tới trang không phải trang đang mở, hoặc cần đối chiếu nhiều trang: chủ động
  `search_pages` rồi `read_page`, không trả lời rằng chỉ đọc được trang đang mở.
- Khi thuật lại kết quả `search_pages`, mỗi trang trình bày dưới dạng link Markdown dùng **đúng**
  trường `url` mà công cụ trả về. TUYỆT ĐỐI không tự ghép URL, không đoán `workspaceId`.

### A4. Test
- `search_pages` trả `url` đúng dạng `/notes/<workspaceId>/<pageId>`.
- Test cho câu neo ngữ cảnh mới (nếu có test cũ khẳng định chuỗi cũ thì cập nhật).

---

## Phần B — notion-service

### B1. Prisma schema + migration

```prisma
model AiConversation {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  pageId      String?              // trang lúc bắt đầu, chỉ để tham khảo
  ...
  @@index([userId, workspaceId, updatedAt])
  @@index([updatedAt])
}
```

Migration SQL theo đúng thứ tự này:
1. `ALTER TABLE ... ADD COLUMN "workspaceId" TEXT;`  (nullable trước)
2. `UPDATE "AiConversation" c SET "workspaceId" = p."workspaceId" FROM "Page" p WHERE p.id = c."pageId";`
3. `DELETE FROM "AiConversation" WHERE "workspaceId" IS NULL;`  (D4 — mất dữ liệu)
4. `ALTER TABLE ... ALTER COLUMN "workspaceId" SET NOT NULL;`
5. `ALTER TABLE ... ALTER COLUMN "pageId" DROP NOT NULL;`
6. Đổi index cũ sang index mới.

KHÔNG tự chạy `prisma migrate deploy` lên DB thật. Chỉ tạo file migration.

### B2. Endpoint

Thay hai route gắn trang bằng hai route gắn workspace:

| Bỏ | Thay bằng |
|---|---|
| `GET  pages/:pageId/ai-conversations` | `GET  workspaces/:workspaceId/ai-conversations` |
| `POST pages/:pageId/ai-conversations` | `POST workspaces/:workspaceId/ai-conversations` |

`POST` nhận body tuỳ chọn `{ pageId?: string }` để ghi lại trang khởi tạo.
Năm route `ai-conversations/:id/...` còn lại **giữ nguyên**.

Mọi route vẫn phải kiểm `conversation.userId === user.id`. Route workspace phải kiểm người dùng
có quyền vào workspace đó — dùng lại đúng cơ chế kiểm quyền workspace sẵn có trong repo,
KHÔNG tự viết mới. Nếu không tìm thấy cơ chế đó, DỪNG VÀ BÁO CÁO.

### B3. Service + test
Cập nhật `AiConversationService` cho khớp. Test tối thiểu:
- liệt kê trả về hội thoại của mọi trang trong workspace, sắp theo `updatedAt` giảm dần
- không trả về hội thoại của workspace khác
- không trả về hội thoại của người dùng khác
- tạo hội thoại không kèm `pageId` vẫn hợp lệ

---

## Phần C — vibe-chat-fe

### C1. `AiMessageContent.tsx` — link nội bộ (D2)
Trong `components.a`: href bắt đầu bằng `/` thì render `next/link` không `target`, còn lại giữ
nguyên hành vi cũ. Component này dùng chung cho cả chat thường nên đừng làm hỏng link ngoài.

### C2. Transport + hook theo endpoint mới
`notion.api.ts` và `services/keys.ts`: đổi khoá và lời gọi từ theo `pageId` sang theo
`workspaceId`. Hook danh sách hội thoại nhận `workspaceId`.

### C3. `AiTab.tsx`
Truyền `workspaceId` thay cho `pageId` vào phần hội thoại. Khi tạo hội thoại mới thì gửi kèm
`pageId` hiện tại làm trang khởi tạo.

### C4. Test
- link nội bộ không mở tab mới, link ngoài vẫn mở tab mới
- danh sách hội thoại lấy theo workspace, không theo trang

---

## Đã biết, CỐ Ý để ngoài phạm vi

`useAiPageChange(pageId)` chỉ theo dõi trang đang mở, nên khi AI sửa một trang khác thì thẻ
diff/hoàn tác không hiện. Đây là hạn chế **đã tồn tại từ trước**, không phải do thay đổi này
gây ra, nhưng sẽ lộ rõ hơn khi hội thoại dùng chung workspace. Sửa nó cần thẻ mang theo
`pageId` của trang thật sự bị sửa — làm ở một plan riêng.

## Tiêu chí hoàn thành
Mỗi repo: `tsc --noEmit` sạch, lint 0 error, test xanh. Không commit. Không chạy migrate lên DB thật.
