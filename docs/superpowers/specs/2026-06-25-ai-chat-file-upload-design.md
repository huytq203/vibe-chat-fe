# Spec: AI Chat — Upload ảnh & file

**Date:** 2026-06-25
**Scope:** `AiChatPanel` — thêm tính năng đính kèm ảnh, PDF, file text vào cuộc trò chuyện với Gemini AI.

---

## 1. Mục tiêu

Cho phép người dùng gửi ảnh và file cùng với tin nhắn văn bản trong AI chat. Gemini API xử lý nội dung multimodal qua `inlineData`. Không cần hạ tầng lưu trữ file ngoài.

---

## 2. Phạm vi hỗ trợ

| Loại | MIME types |
|------|-----------|
| Ảnh | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| PDF | `application/pdf` |
| Text | `text/plain`, `text/csv`, `application/json`, `text/markdown` |

**Giới hạn:** 5 MB/file, tối đa 3 file/message.

---

## 3. Kiến trúc

### 3.1 Data flow

```
User chọn file → useAiAttachments (validate + encode base64)
  → AiAttachmentTray (preview + xóa)
  → handleSend() → callGemini(model, messages, attachments)
  → /api/gemini/chat POST { model, messages, attachments }
  → Gemini generateContent API (inlineData parts)
```

### 3.2 File thay đổi / tạo mới

| File | Loại | Mô tả |
|------|------|-------|
| `src/lib/gemini/index.ts` | Sửa | Thêm type `AiAttachment`, mở rộng `callGemini` |
| `src/app/api/gemini/chat/route.ts` | Sửa | Xử lý parts có `inlineData` |
| `src/features/chat/hooks/useAiSessions.ts` | Sửa | Mở rộng `AiMessage` có `attachmentMeta[]` |
| `src/features/chat/hooks/useAiAttachments.ts` | Tạo mới | Hook quản lý file, validate, encode |
| `src/features/chat/components/layout/AiAttachmentTray.tsx` | Tạo mới | UI tray preview trước khi gửi |
| `src/features/chat/components/layout/AiChatPanel.tsx` | Sửa | Tích hợp tray, nút paperclip, truyền attachments |

---

## 4. Types

```ts
// In-memory — không lưu localStorage
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;   // dùng để gửi Gemini
  previewUrl?: string;  // object URL cho ảnh (revoke sau send)
};

// Lưu vào session localStorage — chỉ metadata
export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
};

// Message type mở rộng
export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
};
```

---

## 5. Hook `useAiAttachments`

**Trách nhiệm:** validate, encode, quản lý state danh sách file.

```ts
// src/features/chat/hooks/useAiAttachments.ts
type UseAiAttachmentsReturn = {
  attachments: AiAttachment[];
  error: string | null;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
};
```

**Logic:**
- Validate: kiểm tra MIME type và size trước khi encode
- Encode: `FileReader.readAsDataURL` → strip prefix `data:...;base64,`
- Tạo `previewUrl` bằng `URL.createObjectURL` (chỉ cho `image/*`)
- Encode song song: `Promise.all`
- `clearAttachments`: revoke toàn bộ object URLs trước khi xóa

---

## 6. Component `AiAttachmentTray`

**Hiển thị khi** `attachments.length > 0`, ẩn khi rỗng.

```
┌──────────────────────────────────────────┐
│ [🖼 48×48] [📄 document.pdf ×] [+] ...  │
│     ×                                    │
└──────────────────────────────────────────┘
```

- **Ảnh:** thumbnail 48×48px rounded, nút `×` góc trên phải
- **PDF/text:** pill chip `[icon] tên-file ×`
- **Validation error:** hiện dưới tray, dạng text `text-danger text-xs`

**Props:**
```ts
interface AiAttachmentTrayProps {
  attachments: AiAttachment[];
  error: string | null;
  onRemove: (id: string) => void;
}
```

---

## 7. Thay đổi UI AiChatPanel

**Input area:**
```
┌──────────────────────────────────────────┐
│ [🖼 ×]  [📄 file.pdf ×]                 │  ← AiAttachmentTray
├──────────────────────────────────────────┤
│ [📎]  [ Nhắn tin với AI...       ] [▶] │  ← thêm nút paperclip trái
└──────────────────────────────────────────┘
```

- Nút paperclip: `<input type="file" multiple accept="..." hidden>` + label button
- `accept`: `image/*,application/pdf,text/plain,text/csv,application/json,text/markdown`
- Send button disabled khi `input.trim() === "" && attachments.length === 0`

---

## 8. Hiển thị trong message bubble

**User message (trong phiên):**
- Ảnh: `<img>` full-width (max-width 200px) bên trên text
- PDF/text: chip compact `[icon] tên-file` bên trên text

**User message (load từ localStorage — không có base64):**
- Ảnh: text muted `[🖼 tên-file.jpg]`
- PDF/text: chip (không có preview data, chỉ metadata)

---

## 9. Gemini API — thay đổi

### Request body mới:
```ts
{
  model: string;
  messages: { role: string; content: string; attachments?: AiAttachmentMeta[] }[];
  attachments?: { base64Data: string; mimeType: string; name: string }[];
}
```

### Parts order trong `contents`:
- Lịch sử cũ: chỉ `{ text }` parts
- Message user hiện tại: `[inlineData, inlineData, ..., text]` — ảnh/file trước, text sau
- Nếu content rỗng nhưng có file: gửi với `text: ""` (Gemini chấp nhận)

### Route `/api/gemini/chat` thêm xử lý:
```ts
const userParts = [
  ...attachments.map(a => ({
    inlineData: { mimeType: a.mimeType, data: a.base64Data }
  })),
  { text: lastUserMessage.content }
];
```

---

## 10. Error handling

| Tình huống | Xử lý |
|-----------|-------|
| File > 5MB | Error inline dưới tray: `"tên-file.png vượt quá 5 MB"` |
| Quá 3 file | `"Tối đa 3 file mỗi lần gửi"` |
| Sai định dạng | `"Định dạng không hỗ trợ: tên-file.exe"` |
| Encode lỗi | Error inline, không gửi |
| Gemini từ chối file | Hiện error ở chat như lỗi thông thường |

**Memory:** Revoke toàn bộ `previewUrl` sau khi `handleSend` hoàn tất (cả success lẫn error).

---

## 11. Không trong phạm vi

- Upload lên cloud storage / CDN
- Gemini File API cho file lớn > 5MB
- Preview PDF inline trong chat
- Copy/paste ảnh từ clipboard
- Drag & drop file
