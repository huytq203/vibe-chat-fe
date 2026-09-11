# Kế hoạch: thay BlockNote bằng Tiptap cho editor ghi chú

Ngày: 2026-09-11
Repo: `vibe-chat-fe`, `notion-service`  (ai-service: KHÔNG đụng)
Tham khảo: `/home/huytq/code/beam/fe/task-management-app`

## Khảo sát (đo thật, không suy đoán)

### Phạm vi phụ thuộc BlockNote

| Repo | File nguồn | Ghi chú |
|---|---|---|
| ai-service | **0** | chỉ nói Markdown qua `internal/ai` — KHÔNG SỬA GÌ |
| notion-service | 9 | toàn bộ qua `@blocknote/server-util` |
| vibe-chat-fe | 4 + `index.css` | `@blocknote/{core,react,mantine,core/yjs,core/locales}` |

### API BlockNote đang dùng và tương đương Tiptap

**Frontend** — `NoteEditor.tsx`:

| BlockNote | Tiptap |
|---|---|
| `useCreateBlockNote` | `useEditor` (`@tiptap/react`) |
| `BlockNoteView` | `EditorContent` |
| `withCollaboration` (`core/yjs`) | `@tiptap/extension-collaboration` + `-caret` |
| `editor.document` | `editor.getJSON()` |
| `editor.onChange` / `onBeforeChange` | `onUpdate` / `onBeforeCreate` + `appendTransaction` |
| `editor.transact` | `editor.commands` / `chain()` |
| `editor.insertBlocks` | `editor.commands.insertContentAt` |
| `editor.getTextCursorPosition` / `setTextCursorPosition` | `editor.state.selection` / `setTextSelection` |
| tay cầm kéo, menu khối | `@tiptap/extension-drag-handle-react` |

**notion-service** — `@blocknote/server-util`, 9 chỗ gọi:

| BlockNote | Tiptap | Dùng ở |
|---|---|---|
| `tryParseMarkdownToBlocks` | markdown → HTML → `generateJSON` | `page-content-write.service.ts:87` |
| `blocksToYXmlFragment` | `prosemirrorToYXmlFragment` (`y-prosemirror`) | `page-content-write:111,122,128` · `version-restore:87` |
| `yDocToBlocks` | `yXmlFragmentToProsemirrorJSON` | `page-content-write:115` · `version-restore:80` · `document-content:33,40,51` |
| `blocksToFullHTML` | `@tiptap/static-renderer` | `document-content.service.ts:35` |
| `blocksToMarkdownLossy` | `prosemirror-markdown` serializer | `document-content.service.ts:43` |

**KHÔNG bị ảnh hưởng:** `comment-body.ts` (cố tình tránh server-util, xem comment dòng 6-7),
`collab.server.ts`, `yjs.loader.ts` (chỉ nạp Yjs), toàn bộ ai-service.

### Dự án tham khảo cho được gì

Tiptap thuần, KHÔNG dùng registry trả phí. `src/features/notes/editor/` ~2.140 dòng:
`note-editor.tsx` 409 · `slash-command.tsx` 171 · `suggestion-popup.tsx` 152 ·
`extensions.ts` 98 · `table-ops.ts` 83 · `code-block-view.tsx` 70 ·
`note-content-view.tsx` 67 (dùng `@tiptap/static-renderer`) · `table-grid-picker.tsx` 46 ·
`note-toolbar.tsx` 695 (giao diện của họ, ta có UX khác — chỉ tham khảo)

### Dự án tham khảo KHÔNG cho được gì

1. **Cộng tác.** Comment trong `src/lib/tiptap/y-tiptap-browser-stub.ts` ghi rõ:
   *"Our notes are NON-collaborative: no `Collaboration` extension is ever added"*.
   Bản cộng tác của họ là **BlockSuite**, nạp riêng qua `public/editor/`.
2. **Markdown → Y.Doc phía server.** Hàm `markdownToUpdate` của họ là của BlockSuite,
   nằm trong bundle riêng.

### Bẫy đã biết trước

Họ phải viết stub cho `@tiptap/y-tiptap` vì `extension-drag-handle` kéo theo
`extension-collaboration` + `y-tiptap`, gây **hai bản yjs** trong bundle →
`"Yjs was already imported. This breaks constructor checks"`.
Ta CẦN collaboration nên giữ bản thật, nhưng phải đảm bảo **đúng một instance yjs**
sau khi gỡ BlockNote. Kiểm tra bằng `npm ls yjs` và ở runtime.

### Dữ liệu phải chuyển

DB production: **7 trang**, **7 PageDoc**, **59 PageVersion**.
`PageDoc.state` là nhị phân Yjs mang schema ProseMirror của BlockNote — Tiptap đọc không ra.

---

## Giai đoạn

Mỗi giai đoạn phải để app CHẠY ĐƯỢC khi dừng lại giữa chừng.

### GĐ 0 — Cài thư viện + bê code sang (song song, chưa nối)
- Cài các gói còn thiếu (đã hỏi user).
- Copy các file dùng lại được từ dự án tham khảo vào `src/features/notes/editor-next/`.
- **Chưa** nối vào route nào. App vẫn chạy BlockNote.

### GĐ 1 — Schema + cộng tác
- Chốt tập extension = **schema nguồn sự thật**. Ghi ra tài liệu, vì server phải dùng ĐÚNG tập này.
- Nối `Collaboration` + `CollaborationCaret` vào provider Hocuspocus sẵn có.
- Kiểm: hai tab cùng sửa, con trỏ hiện đúng.

### GĐ 2 — notion-service đổi sang Tiptap
- Thay 5 hàm trong bảng ánh xạ ở trên.
- **Phải chạy được headless trong Node** — đây là rủi ro lớn nhất của giai đoạn này.
- Giữ nguyên chữ ký service, chỉ đổi ruột. `internal/ai` KHÔNG đổi → ai-service không phải sửa.

### GĐ 3 — FE chuyển sang editor mới
- Đổi `NoteEditor` sang Tiptap.
- Mục lục: dùng `src/lib/editor/heading-outline.ts` SẴN CÓ, xoá `features/notes/lib/page-outline.ts`
  (hai file này trùng chức năng — xem mục Nợ bên dưới).
- Viết lại CSS `.bn-*` và `PUBLIC_CONTENT_STYLES` trong `PublicPageBody.tsx`.

### GĐ 4 — Chuyển dữ liệu
- 7 trang: xuất Markdown bằng BlockNote (còn cài) → nạp vào Y.Doc Tiptap.
- 59 version: **cần quyết định** — chuyển hay bỏ.
- Chạy trên bản sao DB trước, không chạy thẳng production.

### GĐ 5 — Gỡ BlockNote
- Gỡ 5 gói `@blocknote/*`, xoá CSS và code chết.
- `npm ls yjs` phải ra đúng một bản.

---

## Nợ phát hiện khi khảo sát

`src/lib/editor/heading-outline.ts` (`extractHeadingOutline`, có test) làm **đúng việc** mà
`src/features/notes/lib/page-outline.ts` (`toOutline`) đang làm. Cùng kiểu `OutlineItem`.
Không file nguồn nào import bản ở `lib/editor`. Đây là trùng lặp do lượt trước tôi tạo mà
không tra trước. GĐ 3 gộp lại, giữ bản ở `lib/editor` vì nó thuộc lớp bọc dùng chung.

## Ngoài phạm vi
Editor của chat và tasks (`RichMessageEditor`, `TaskDescriptionEditor`) — đã là Tiptap, không đụng.

Menu khối chưa làm `Copy link to block`, `Comment`, `Move to`: cả ba cần ID khối ổn định.
Chỉ triển khai sau khi schema Tiptap có `UniqueID` và đường nâng cấp dữ liệu cộng tác tương ứng.

---

## Cập nhật 2026-09-11 (sau khảo sát lại)

### Quyết định của người dùng
**7 trang và 59 version hiện có là dữ liệu test — XOÁ, không chuyển.** Vì vậy:
- GĐ 4 đổi từ "chuyển dữ liệu" thành "xoá dữ liệu test" (xem bên dưới).
- Công tắc `SELECTED_NOTE_EDITOR = TIPTAP` là **quyết định**, không phải bật nhầm.
  Comment cũ trong `constants.ts` ("giữ BlockNote cho tới GĐ 4") đã lỗi thời — phải sửa.
- Test `nên dùng BlockNote khi công tắc để mặc định` đang đỏ vì kỳ vọng cũ — phải đổi kỳ vọng.

### Trạng thái đo được
| GĐ | Thật sự |
|---|---|
| 0 | xong — `editor-next/` 8 file |
| 1 | xong — `NoteEditorNext` nhận `doc` + `provider` |
| 2 | **dở**: `TiptapDocumentService` đã viết + có spec, nhưng CHƯA đăng ký trong `documents.module.ts`, và 3 service (`document-content`, `page-content-write`, `version-restore`) vẫn tiêm `BlocknoteLoader` |
| 3 | dở: công tắc đã bật, mục lục đã dùng `lib/editor/heading-outline.ts`, CSS `.bn-*` chưa dọn |
| 4 | chưa |
| 5 | chưa |

Chỉ **một** file import `@blocknote/server-util` thật (`blocknote.provider.ts`); 6 file khác chỉ nhắc trong comment.

### GĐ 2 — việc còn lại, có một chỗ KHÔNG phải đổi tên máy móc
Thay `BlocknoteLoader` → `TiptapDocumentService` trong 3 service, giữ nguyên chữ ký public.

**Bẫy ở `page-content-write.service.ts` chế độ `append`:** logic hiện tại clone node vào
`blockGroup` (wrapper của BlockNote) và tính vị trí chèn theo `targetGroup.length`. Tiptap
**không có `blockGroup`** — node con nằm thẳng trong fragment. Phải chèn trực tiếp vào fragment,
và xem lại `dropTrailingEmptyParagraphs` theo cách Tiptap giữ đoạn rỗng cuối (có/không
`TrailingNode` trong `tiptap-schema.ts`). Đây là thay đổi thiết kế, không phải rename.

### GĐ 4 (mới) — xoá dữ liệu test
Sau khi GĐ 2 + 3 xong và app chạy được bằng Tiptap:
- Xoá `PageDoc`, `PageVersion`, và object snapshot trên MinIO của 7 trang; hoặc xoá hẳn 7 trang.
- Chạy trên DB thật chỉ khi người dùng xác nhận câu lệnh cụ thể. Không tự chạy.

### Tiến độ 2026-09-11 (buổi sáng)
- GĐ 2 xong: `TiptapDocumentService.sync()` (await runtime một lần ngoài `mutateDocument`, hai hàm
  đồng bộ bên trong). 3 service không còn `BlocknoteLoader`. Append chèn CRDT vào fragment phẳng
  trước `TrailingNode`.
- GĐ 3 xong phần: công tắc TIPTAP + comment/test khớp; `PublicPageBody` style theo HTML Tiptap.
- **Sự cố:** mở trang BlockNote cũ → `yXmlFragmentToProsemirrorJSON` ném `Unexpected case` →
  unhandled rejection → **notion-service sập hẳn**. Đã chống sập ba lớp: `extract()` xuống cấp
  không throw; `performWrite()` vẫn lưu state; `onStoreDocument` bắt + log, chỉ ném lại khi
  `socketId === 'server'`.
- GĐ 4 xong: `DELETE FROM "Page"` → 3 trang, 3 PageDoc, 17 version. 17 snapshot MinIO mồ côi
  (dữ liệu test, dọn sau). 14 hội thoại AI giữ nguyên (thuộc workspace).
- Parity NoteEditorNext 1/4 xong: phát mục lục, neo theo thứ tự heading (không UniqueID).
  Còn 3: code block (ngôn ngữ/tô màu/sao chép/fallback text), dán-kéo tệp + `attachment://`,
  ngưỡng 3/5 MB.
- Chưa nghiệm thu UI thật vì service sập giữa chừng. Bước kế: khởi động lại → kiểm mục lục
  trong trình duyệt → parity 2/4.

### Parity NoteEditorNext — danh sách đầy đủ (cập nhật 11/09 trưa)
Đối chiếu lại sau khi người dùng dùng thử. Schema (FE + server) ĐÃ có Color/Highlight/TextStyle;
thiếu là GIAO DIỆN. Không cần cài gói mới — mọi @tiptap/* cần thiết đã có trong package.json.

| # | Năng lực | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Phát mục lục | **xong** | neo theo thứ tự heading |
| 2a | Menu khối trên `⠿`: xoá, nhân đôi, đổi kiểu khối | chưa | menu hiện chỉ có "chèn dưới" + "kéo" |
| 2b | Bubble menu khi bôi đen: B/I/U/S/code/link + **bảng màu chữ & highlight** | chưa | schema sẵn, thiếu UI |
| 3 | Code block: chọn ngôn ngữ, tô màu, sao chép, ngôn ngữ lạ → text | chưa | bài học `Language js` |
| 4 | Dán/kéo-thả tệp + resolve `attachment://` | chưa | |
| 5 | Ngưỡng 3/5 MB | chưa | |

Bài học GĐ 0 (ghi để không lặp): bê code từ dự án tham khảo PHẢI gạn token. `editor-next/` từng
mang 13 token `tz-*` không tồn tại trong theme → menu `/` render trong suốt. Tailwind không báo
lỗi cho class lạ. Mọi lần bê thêm (bubble menu…) phải `grep tz-` trước khi coi là xong.
