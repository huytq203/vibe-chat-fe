# Rich text editor cho ô soạn tin (FE + BE)

> Spec — 2026-06-15. Repo FE: `vibe-chat-fe`. Repo BE: `vibe-chat`.

## 1. Mục tiêu

Cho phép soạn tin nhắn có định dạng kiểu Teams/Zalo trong `MessageInput`:

- Inline: **đậm**, *nghiêng*, gạch chân, gạch ngang.
- Insert link: nhập text hiển thị + URL; click mở tab mới.
- Màu chữ & highlight (màu nền chữ).
- Font-family (preset) & căn lề (trái / giữa / phải).

Không phá vỡ các luồng hiện có: mention (@user, @all), emoji, typing indicator,
paste ảnh → attachment, self-destruct, reply, edit, search, preview, push.

## 2. Quyết định kiến trúc (đã chốt)

| Vấn đề | Quyết định |
| --- | --- |
| Lưu định dạng | **Format ranges trong `metadata.richText`** (plaintext giữ thuần) |
| Editor | **Tiptap v3** (React 19 / Next 16) |
| Read path | Renderer React riêng, **không** dùng Tiptap |

## 3. Mô hình dữ liệu

`plaintext` vẫn là text thuần — nguồn sự thật cho search / preview / push / mã hoá /
offset mention. Định dạng lưu trong `metadata.richText`:

```ts
type RichMarkType =
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'color' | 'highlight' | 'link' | 'font';

type RichMark = {
  start: number;   // offset UTF-16 trong plaintext, đồng bộ với mentions
  end: number;     // exclusive
  type: RichMarkType;
  value?: string;  // color/highlight=hex (whitelist); link=URL; font=preset key
};

type RichBlock = {
  start: number;
  end: number;
  align: 'left' | 'center' | 'right';
};

type RichText = {
  v: 1;
  marks: RichMark[];
  blocks: RichBlock[];
};
```

- Offset tính theo UTF-16 code unit của `plaintext` (giống `Mention`).
- `mentions` **vẫn ở mảng riêng** như hiện tại — KHÔNG nhét vào `marks`.
- Tin không định dạng → `metadata.richText` vắng mặt → render như hiện tại (fallback).

### Whitelist giá trị (preset DESIGN)

- **Màu chữ / highlight**: tập màu cố định lấy từ `Design/DESIGN.md` / theme tokens
  (vd: primary, success, warning, danger, foreground/muted). Không nhận hex tuỳ ý.
- **Font**: 3 preset — `default` (sans hệ thống), `serif`, `mono`. Map sang
  font-family thực ở read path & editor.
- **Link**: chỉ scheme `http`, `https`, `mailto`. Chặn `javascript:`, `data:`, …

## 4. Thay đổi Backend (`vibe-chat`)

Tối thiểu — `metadata` đã được persist khi gửi (`messages.service.ts:212`) và trả về
trong response (`:1320`). WS send dùng `WsSendServerMessageDto extends SendServerMessageDto`
nên cũng đã mang `metadata`.

1. **Edit message**: thêm `metadata?: Record<string, unknown>` (optional) vào
   `EditServerMessageDto`. Vì `WsEditServerMessageDto extends EditServerMessageDto`,
   cả REST lẫn WS edit đều có. Service `editMessage` cập nhật `metadata` khi sửa.
2. **Validate richText** (nhẹ, không over-engineer): nếu `metadata.richText` tồn tại,
   kiểm tra cấu trúc cơ bản + whitelist:
   - `link.value`: scheme hợp lệ (http/https/mailto), độ dài giới hạn.
   - `color`/`highlight`/`font`: thuộc whitelist.
   - offset trong `[0, plaintext.length]`, `start < end`, số lượng marks/blocks có cap.
   - Mark/block lỗi → **loại bỏ riêng mark/block đó** (lenient, không reject cả tin).
   - Chỉ trả **400** khi `richText` sai kiểu (không phải object) hoặc vượt cap kích thước.
   Đặt ở helper dùng chung cho cả send & edit.
3. KHÔNG đổi schema Mongo (`metadata` đã là `Object`).

## 5. Frontend — Editor (`vibe-chat-fe`)

### 5.1 Wrap lib

- Thư mục `src/lib/editor/` bọc Tiptap (tuân luật §6 wrap lib): export factory tạo
  editor + danh sách extension preset + helper. Feature KHÔNG import `@tiptap/*`
  rải rác.
- Packages (Tiptap v3): `@tiptap/react`, `@tiptap/core`, `@tiptap/pm`,
  `@tiptap/extension-document/paragraph/text/bold/italic/underline/strike/link`,
  `@tiptap/extension-text-style` + `@tiptap/extension-color`,
  `@tiptap/extension-highlight`, `@tiptap/extension-font-family`,
  `@tiptap/extension-text-align`, `@tiptap/extension-mention`,
  `@tiptap/extension-placeholder`, `@tiptap/extension-history`.

### 5.2 Component

- `RichMessageEditor` — thay khối `contenteditable` trong `MessageInput.tsx`. Lá client.
- `MessageToolbar` — nút: đậm / nghiêng / gạch chân / gạch ngang / màu chữ / highlight /
  font / căn lề / link. Tách nhóm nút thành component con để giữ < 200 dòng.
  Dùng Basuicn (Button, Popover, DropdownMenu) — không tự viết primitive.
- Toolbar phản ánh trạng thái active theo selection (Tiptap `editor.isActive`).

### 5.3 Tích hợp luồng cũ

- **Mention**: dùng Tiptap `Mention` extension; render suggestion bridge sang
  `MentionSuggestPopup` + `useMentionSuggest` hiện có. Giữ chip `@all` (sentinel).
  Mention thành node → serialize ra `Mention[]` (offset) dễ & chính xác.
- **Emoji**: `EmojiPicker` chèn ký tự unicode vào editor (insertContent). Twemoji
  hiển thị ở read path.
- **Typing / paste-ảnh / attachment / self-destruct / reply / edit**: giữ logic trong
  `useMessageComposer`, chỉ đổi nguồn nội dung từ DOM contenteditable → Tiptap editor
  instance. `onUpdate` → typing + hasContent. `editorProps.handlePaste` → ảnh vào tray.
- **Giới hạn**: MAX_LENGTH 5000 theo độ dài `plaintext` serialize.

### 5.4 Serializer

- `editorToMessage(editor)` → `{ plaintext, mentions, richText }`:
  duyệt Tiptap doc/JSON → text thuần + offset mention + marks/blocks.
- `messageToEditor(plaintext, mentions, richText)` → Tiptap content để nạp lại khi
  bắt đầu Edit. Round-trip phải ổn định (test).

## 6. Frontend — Read path (render bubble)

- Component `RichText` (nâng từ `MentionText`): props `text + mentions + richText`.
  Thuật toán: chia text thành các đoạn theo ranh giới marks + mentions + blocks,
  dựng `<span>` lồng style (đậm/nghiêng/màu/highlight/font), wrap block theo align.
  Đoạn không mark vẫn qua `EmojiText` (emoji + linkify tự động như cũ).
- `link` mark → `<a target="_blank" rel="noopener noreferrer">`, validate scheme.
- KHÔNG dùng Tiptap, KHÔNG `dangerouslySetInnerHTML` → render bằng React, an toàn XSS.
- `MessageBubble.BubbleContent`: nếu `richText` có → `RichText`, else giữ nhánh
  `MentionText` / `EmojiText` hiện tại (fallback tin cũ).

## 7. Bảo mật

- Link scheme whitelist ở **cả FE & BE**; `rel="noopener noreferrer"`, `target="_blank"`.
- Color/font chỉ nhận từ preset whitelist (FE & BE).
- Render React thuần, không innerHTML.
- Không tin client → BE validate lại richText.

## 8. Test

- Unit: `editorToMessage` / `messageToEditor` round-trip (đậm + mention + emoji +
  link + align + overlap marks); `sanitizeLinkUrl`; whitelist color/font.
- Component (`RichText`): overlap marks, link render, fallback tin cũ không richText.
- Component (`MessageToolbar`): toggle đậm/nghiêng, insert link (text + url).
- BE: validate richText (loại mark lỗi, link scheme), edit giữ metadata.

## 9. Giới hạn (YAGNI — KHÔNG làm v1)

- Danh sách (bullet/ordered), blockquote, code block, bảng.
- Ảnh inline trong text, mention nhover-card mới.
- Markdown shortcut nhập tay (có thể thêm sau qua Tiptap input rules).

## 10. Phạm vi file dự kiến

**FE**: `src/lib/editor/*` (mới), `features/chat/components/messages/RichMessageEditor.tsx`,
`MessageToolbar.tsx` (+ nhóm nút), `RichText.tsx` (mới), sửa `MessageInput.tsx`,
`MessageBubble.tsx`, `useMessageComposer.ts`, `composer-utils.ts`, `types.ts`,
`services/chat.api.ts` (edit gửi metadata), tests.

**BE**: `dto/edit-message.dto.ts`, `messages.service.ts` (editMessage update metadata),
helper validate richText (dùng chung send/edit), tests.
