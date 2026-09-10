# Kế hoạch: lịch sử & dọn nợ quanh việc AI đổi tiêu đề

Ngày: 2026-09-10
Repo: `notion-service`, `ai-service`, `vibe-chat-fe`

## Bối cảnh

Sau khi thêm công cụ `rename_page`, người dùng đổi tiêu đề rồi mở thẻ thay đổi thì thấy
"Không có thay đổi nào", và bấm hoàn tác thì tiêu đề không trở về cũ.

Nguyên nhân đã truy được, KHÔNG phải đoán:

1. `useAiPageDiff` so `versionsApi.detail(versionId).markdown` với `exportApi.markdown(pageId)`.
   Cả hai đều là `content.renderMarkdown(doc)` — **chỉ khối nội dung, không có tiêu đề**.
   Đổi mỗi tiêu đề thì hai chuỗi giống hệt nhau nên diff rỗng.
2. `version-restore.service.ts` bước 3 chỉ ghi lại `COLLAB_FRAGMENT_NAME`.
   Tiêu đề nằm ở `doc.getText(TITLE_KEY)`, snapshot CÓ chứa nó, nhưng restore không ghi lại.

---

## Phần A — notion-service

### A1. `src/modules/versions/version-read.service.ts`

Hàm detail (khoảng dòng 88-108) đang trả `{ ...stripStorageKey(version), html, markdown }`.
Thêm `title: docTitle(doc)` (import `docTitle` từ `@/modules/documents/yjs.util`).

Đây là tiêu đề tại thời điểm chụp snapshot, để giao diện so với tiêu đề hiện tại.

### A2. `src/modules/versions/version-restore.service.ts`

Bước 3 hiện chỉ ghi fragment nội dung. Bổ sung ghi lại tiêu đề trong **cùng một**
`mutateDocument` (không mở connection thứ hai):

```ts
const oldTitle = docTitle(oldDoc);
await this.collab.mutateDocument(page.id, user.id, (doc) => {
  const frag = doc.getXmlFragment(COLLAB_FRAGMENT_NAME);
  editor.blocksToYXmlFragment(blocks, frag);
  const text = doc.getText(TITLE_KEY);
  text.delete(0, text.length);
  text.insert(0, oldTitle);
});
```

`docTitle(oldDoc)` phải tính TRƯỚC khi vào callback, vì callback là hàm đồng bộ.

Khôi phục tiêu đề **đúng như snapshot**, kể cả khi snapshot có tiêu đề rỗng — restore nghĩa là
đưa về đúng trạng thái đã chụp, không tự ý giữ lại tiêu đề hiện tại.

### A3. Test

- `version-read`: detail trả về đúng tiêu đề tại thời điểm chụp.
- `version-restore`: sau restore, Y.Text tiêu đề bằng đúng tiêu đề của snapshot, và
  **không còn sót ký tự** của tiêu đề mới.
- `version-restore`: snapshot có tiêu đề rỗng thì sau restore tiêu đề cũng rỗng.
- Khẳng định chỉ mở **một** connection: `mutateDocument` được gọi đúng 1 lần.

---

## Phần B — ai-service (dọn nợ, độc lập với A và C)

### B1. Gỡ nhánh `PAGE_IN_USE` đã chết

Chốt chặn "trang đang mở" đã bị gỡ khỏi notion-service theo yêu cầu người dùng.
`grep` xác nhận notion-service không còn chỗ nào ném `PAGE_IN_USE`; hằng số chỉ còn trơ
trong `error-codes.ts`.

Gỡ ở ai-service:
- `notion-tools.factory.ts`: hằng `PAGE_IN_USE_GUIDANCE` (dòng ~13) và nhánh
  `if (error.code === 'PAGE_IN_USE')` (dòng ~109).
- `prompts/notion-system-prompt.md`: xoá dòng dạy AI xử lý khi `write_page_content` trả về
  "Trang đang được mở nên không ghi trực tiếp được" (dòng ~28).
- Xoá các test bám vào nhánh này nếu có.

KHÔNG đụng `error-codes.ts` bên notion-service.

### B2. Sửa 10 lỗi `npx tsc --noEmit`

Toàn bộ nằm trong file test. Chạy `npx tsc --noEmit` để lấy danh sách hiện tại.

- `src/config/tests/env.validation.spec.ts:35` — fixture `VALID_ENV` **thiếu**
  `INTERNAL_AI_SERVICE_API_SECRET`, nên `delete withoutSecret.INTERNAL_AI_SERVICE_API_SECRET`
  không hợp lệ về kiểu. Test hiện đang **xanh nhầm lý do**: nó tưởng đang kiểm "thiếu secret
  thì validation phải fail", thực tế key đó chưa từng có trong fixture nên chẳng kiểm gì.
  Sửa bằng cách THÊM key vào `VALID_ENV` (giá trị hợp lệ, tối thiểu 16 ký tự theo Joi schema
  dòng 23), để phép xoá trở nên có nghĩa. **Không** sửa bằng cách ép kiểu cho hết lỗi.
- 2 lỗi `TS2352` ép kiểu mock (`completions.controller.spec.ts`,
  `halo-bot-webhook.controller.spec.ts`) — dùng `as unknown as X`.
- 7 lỗi `TS2743` "No overload expects 1 type arguments" ở provider tests — kiểu generic của
  `jest.fn` trong Jest 30. Sửa cho đúng chữ ký, không dùng `any`.

Sau khi sửa, `npx tsc --noEmit` phải sạch hoàn toàn.

---

## Phần C — vibe-chat-fe (làm SAU Phần A)

### C1. `src/services/notion.api.ts`

Kiểu trả về của `versionsApi.detail` thêm `title: string`. Cập nhật schema Zod nếu có.

### C2. `src/features/notes/hooks/useAiPageDiff.ts`

Trả về `{ segments, previousTitle }` thay vì chỉ mảng segment.

### C3. `src/features/notes/components/panel/AiPageChangeCard.tsx`

- `DiffPanel` nhận thêm `previousTitle` và `currentTitle`.
- Khi hai tiêu đề khác nhau, hiện một dòng thay đổi tiêu đề phía trên phần diff nội dung,
  dùng lại `<del>`/`<ins>` và bảng màu `danger`/`success` sẵn có của `DiffText`.
- **Điều kiện "Không có thay đổi nào" phải tính cả tiêu đề**: chỉ hiện câu đó khi nội dung
  không đổi VÀ tiêu đề không đổi. Đây chính là lỗi người dùng gặp.
- Component đang gần 200 dòng; vượt thì tách phần diff tiêu đề ra component riêng cùng thư mục.

### C4. Test — `AiPageChangeCard.test.tsx`

- `nên hiện thay đổi tiêu đề khi chỉ đổi tiêu đề` (nội dung giống nhau) — và **không** hiện
  "Không có thay đổi nào".
- `nên hiện cả tiêu đề và nội dung khi đổi cả hai`
- `nên hiện không có thay đổi nào khi cả tiêu đề và nội dung đều giữ nguyên`

---

## Tiêu chí hoàn thành

Mỗi repo: `tsc --noEmit` sạch, lint 0 error, test xanh. Không commit.
