# Lịch sử hội thoại AI lưu trên server — Design Spec

**Ngày:** 2026-09-09
**Phạm vi:** `vibe-chat`, `notion-service`, `vibe-chat-fe`
**Không đụng:** `ai-service`

## Vấn đề

Hội thoại với AI hiện không sống qua được việc đóng cửa sổ.

- **Chat**: `useAiSessions` lưu `localStorage`. Sống qua F5 nhưng chỉ trên đúng trình duyệt đó, và đã phải cố ý **không** lưu `data` base64 của đính kèm vì *"vài MB base64 sẽ làm vỡ quota localStorage"* (comment trong code).
- **Tab AI của ghi chú**: `useNoteAiSession` giữ trong React state. Đóng bảng bên là mất sạch.

Cái mất không nhỏ: câu trả lời của AI thường là một bản phân tích dài — chuẩn hoá định dạng, tóm tắt trang, đề xuất sửa. Mất nó nghĩa là phải hỏi lại từ đầu và tốn thêm một lượt gọi model.

## Ràng buộc khảo sát được

**R1 — `CredentialCipher` chỉ có ở `ai-service`.** Nó dùng AES-GCM, `seal()` trả `{ cipher, iv, tag }` — ba `Buffer`, không phải một chuỗi. Đưa mã hoá sang hai domain nghĩa là chép cơ chế này sang cả hai, mỗi nơi một khoá riêng trong env.

**R2 — Đính kèm có thể rất lớn.** `AiChatMessageDto` cho tối đa 3 tệp mỗi lượt, mỗi tệp base64 tới `MAX_BASE64_LENGTH = 8_000_000`. Lưu thẳng vào DB thì một người dùng gửi 10 ảnh/ngày trong 30 ngày đã ~2.4 GB, và mọi bản backup đều mang theo.

**R3 — Hạ tầng hai domain lệch nhau.**

| | S3/MinIO | Lịch chạy định kỳ |
|---|---|---|
| `notion-service` | ✓ `StorageService` | ✓ `trash-cleanup.service.ts` — khuôn sẵn cho job 30 ngày |
| `vibe-chat` | ✓ | ✗ chưa có `ScheduleModule` |

**R4 — `AiSessionActions` là cổng đã có sẵn.** `useAiConversation` nhận `{ session, actions }` với `actions` là 6 method thuần. Đổi chỗ lưu không cần sửa hook — chỉ thay bản hiện thực của cổng. Đây là lý do giai đoạn trước cố ý giữ nguyên cổng này.

**R5 — Tiêu đề hiện tại lộ nội dung.** `useAiSessions` lấy tiêu đề từ 40 ký tự đầu của tin nhắn đầu tiên. Mã hoá nội dung mà để tiêu đề thô là để lộ đúng phần tiết lộ nhất.

## Quyết định thiết kế

### D1 — Mỗi domain tự sở hữu kho hội thoại của mình

`vibe-chat` giữ lịch sử chat; `notion-service` giữ lịch sử tab AI của ghi chú. Hai bản hiện thực độc lập, cùng một hình dạng. Không service nào biết service kia có tính năng này.

*Đã cân nhắc và loại:* để `ai-service` sở hữu một kho chung thì chỉ phải làm một lần, nhưng khi xoá trang thì hội thoại về trang đó không tự mất — `ai-service` không có cách nào biết trang bị xoá, nên nội dung trang (đã bị AI trích vào câu trả lời) còn sống tối đa 30 ngày nữa ở DB khác. Với D1 thì `notion-service` xoá trang và xoá hội thoại trong cùng một transaction, không lệch được.

*Cái giá đã chấp nhận:* schema, mã hoá, job dọn, đấu MinIO và endpoint đều phải làm **hai lần**.

### D2 — FE ghi, không phải `ai-service` đẩy

Stream xong, FE gọi domain service lưu lượt vừa rồi. `ai-service` không đụng tới lịch sử.

Ba lý do, xếp theo sức nặng:

1. **Luồng đứt giữa chừng.** Cả hai luồng đã xử lý ca người dùng bấm Dừng hoặc mạng rớt: giữ phần chữ đã nhận, đánh dấu `incomplete`. FE lưu **đúng thứ người dùng đã nhìn thấy**; `ai-service` chỉ biết thứ nó đã sinh ra, có thể nhiều hơn những gì tới được màn hình.
2. **Đẩy từ server không loại được FE khỏi vòng lặp.** Luồng AI không trạng thái — FE gửi lại nguyên `messages[]` mỗi lượt, `ai-service` không biết `conversationId`. Muốn nó ghi nối đúng chỗ thì FE vẫn phải truyền id xuống, thành ra **hai bên cùng ghi một dòng**.
3. **Không đặt việc lưu lên đường tới hạn** của `ai-service`.

*Không chặn đường sau:* khi cần AI chạy nền không có client (P6 của lộ trình notion-AI), thêm đường ghi server-side **riêng cho luồng đó**. Hai luồng khác bản chất thì có hai cách lưu là hợp lý.

### D3 — Mã hoá nội dung và tiêu đề ở tầng ứng dụng

Cả `content` lẫn `title` đều mã hoá bằng cơ chế của `CredentialCipher` (AES-GCM), gói `cipher‖iv‖tag` vào **một cột `Bytes`**. Tách ba cột thì hai trường mã hoá thành sáu cột, schema loãng mà không được gì.

Để **thô và đánh index**: `id`, `userId`, `pageId`, `createdAt`, `updatedAt`, `role`, thứ tự tin nhắn. Nhờ vậy mọi thao tác thật đều dùng index: mở lại hội thoại của một trang, liệt kê gần nhất, quét dọn quá hạn.

Cái mất duy nhất là **tìm kiếm bên trong nội dung** — muốn vậy phải giải mã toàn bộ rồi quét tuyến tính. Không cần: giao diện đã chốt là không có ô tìm kiếm.

`title` bắt buộc mã hoá theo R5. Danh sách chỉ vài chục hội thoại nên giải mã tiêu đề khi liệt kê là rẻ.

### D4 — Đính kèm lên MinIO, DB chỉ giữ khoá

`StorageService` của `notion-service` chỉ có **một bucket** (`S3_BUCKET`, mặc định `halo-notion`) với `putObject`/`getObject`/`deleteObject`. Nên không tạo bucket mới — dùng **tiền tố khoá** `ai-conversations/<conversationId>/<uuid>`.

FE tải tệp lên trước, nhận `storageKey`, rồi mới gửi lượt.

Job dọn phải **xoá object trước, xoá dòng sau**. Ngược lại thì mất khoá là tệp mồ côi vĩnh viễn.

*Đã cân nhắc và loại:* chỉ lưu metadata thì nhẹ nhất nhưng mở lại không xem được ảnh đã gửi; lưu bytes thẳng vào DB thì vỡ theo R2.

### D5 — 30 ngày tính từ lần dùng cuối

Mốc là `updatedAt`, không phải `createdAt`. Hội thoại còn được quay lại dùng thì không nên tự biến mất giữa chừng.

### D6 — Ghi theo lượt, không theo từng tin nhắn

`POST /ai-conversations/:id/turns` nhận **cả tin người dùng lẫn tin trợ lý** và ghi trong một transaction. Một lượt là một đơn vị nguyên vẹn; ghi nửa vời sẽ để lại tin hỏi không có tin đáp.

### D7 — Tiêu đề do AI đặt, gọi sau lượt đầu

Sau khi lượt đầu tiên hoàn tất, FE gọi `/api/v1/ai/chat` (bản không stream, đã có sẵn) với prompt ngắn yêu cầu đặt tiêu đề ≤6 từ, rồi `PATCH` lên domain service. Tốn thêm một lượt gọi model rẻ cho mỗi hội thoại, **không cần endpoint mới ở `ai-service`**.

Gọi hỏng thì lùi về 40 ký tự đầu của tin nhắn đầu — hành vi hiện tại của chat.

### D8 — Bỏ lịch sử `localStorage` cũ, không nhập

Lần đầu chạy bản mới, FE xoá key `localStorage` của `useAiSessions`. Không viết endpoint nhập hàng loạt, không giữ hai nguồn dữ liệu song song.

### D9 — Chat giữ nguyên giao diện

Chat đang có `AiHistoryPanel` + `AiSessionList`. Lần này **chỉ đổi chỗ lưu**, không đổi UI. Đổi giao diện chat sang kiểu dropdown là một việc riêng, trộn vào đây sẽ làm phạm vi phình và khó review.

## Schema

`notion-service` như dưới; `vibe-chat` giống hệt nhưng **không có `pageId`** và bỏ index liên quan.

```prisma
model AiConversation {
  id        String   @id @default(cuid())
  userId    String
  pageId    String?              // chỉ notion-service
  title     Bytes?               // cipher‖iv‖tag; null cho tới khi AI đặt tên
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt  // mốc tính 30 ngày (D5)
  messages  AiConversationMessage[]

  @@index([userId, pageId, updatedAt])
  @@index([updatedAt])
}

model AiConversationMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String               // 'user' | 'assistant'
  content        Bytes                // cipher‖iv‖tag
  status         String?              // 'failed' | 'incomplete'
  attachments    Json?                // [{ name, mimeType, size, storageKey }]
  createdAt      DateTime @default(now())

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

`onDelete: Cascade` để xoá hội thoại là tin nhắn đi theo, job dọn không phải xoá hai bảng.

## Endpoint

Xác thực bằng **JWT của người dùng** — đây là bề mặt công khai cho FE, không phải bề mặt `internal/`. Mọi endpoint kiểm `conversation.userId === user.id`.

| Method | Path | Body / trả về |
|---|---|---|
| GET | `/api/v1/pages/:pageId/ai-conversations` | → `[{ id, title, updatedAt }]`, tiêu đề đã giải mã |
| POST | `/api/v1/pages/:pageId/ai-conversations` | → `{ id }` |
| GET | `/api/v1/ai-conversations/:id` | → `{ id, title, messages: [{ role, content, status, attachments }] }` |
| POST | `/api/v1/ai-conversations/:id/turns` | `{ user: {...}, assistant: {...} }` → `{ ok: true }` |
| PATCH | `/api/v1/ai-conversations/:id` | `{ title }` → `{ id, title }` |
| DELETE | `/api/v1/ai-conversations/:id` | → `{ id }` |
| POST | `/api/v1/ai-conversations/:id/attachments` | multipart → `{ storageKey, name, mimeType, size }` |

`vibe-chat` giống hệt, trừ hai endpoint đầu đổi thành `/api/v1/ai-conversations` (không gắn với trang).

## Job dọn

`@Cron` mỗi ngày. Với mỗi hội thoại có `updatedAt < now − 30 ngày`:

1. Gom mọi `storageKey` trong `attachments` của các tin nhắn thuộc hội thoại đó
2. Xoá object trên MinIO
3. Xoá dòng `AiConversation` (tin nhắn theo cascade)

Thứ tự này bắt buộc theo D4. Xoá object hỏng thì **bỏ qua hội thoại đó, để lượt sau thử lại** — thà giữ thêm một ngày còn hơn để tệp mồ côi.

`notion-service` chép khuôn `trash-cleanup.service.ts`. `vibe-chat` phải thêm `ScheduleModule` trước (R3).

## Frontend

Cổng `AiSessionActions` giữ nguyên (R4), nên **`useAiConversation` không phải sửa một dòng**. Chỉ thay bản hiện thực:

| Hiện tại | Thay bằng |
|---|---|
| `features/chat/hooks/useAiSessions.ts` (localStorage) | hook mới gọi API `vibe-chat`, qua TanStack Query |
| `features/notes/hooks/useNoteAiSession.ts` (bộ nhớ) | hook mới gọi API `notion-service`, qua TanStack Query |

Transport đặt ở `src/services/` theo rule dự án: `ai-conversations.api.ts` (vibe-chat) và bổ sung vào `notion.api.ts`. Query key vào `services/keys.ts`.

Hai điểm phải giữ đúng khi thay:

- Ba method `dropLastAssistant`, `prepareResend`, `removeMessage` **trả về giá trị** dẫn xuất từ state — `useAiConversation` dựa vào chúng, trả sai là hỏng luồng gửi lại.
- `actions` phải giữ **identity ổn định** giữa các lần render, như `useNoteAiSession` hiện tại đã làm.

## Giao diện tab AI của ghi chú

- **Đầu panel**: tiêu đề hội thoại hiện tại; chưa chat thì hiện chỗ trống mặc định. `▾` mở danh sách, nhóm **Today / Older** theo `updatedAt`. Cạnh đó **icon + tin nhắn** để tạo hội thoại mới. Không có ô tìm kiếm.
- **Khi bảng bên đóng**: nút AI nổi ở góc dưới phải khung soạn thảo; bấm vào mở bảng bên và nhảy thẳng vào tab AI.

## Ngoài phạm vi

- Đổi giao diện chat sang kiểu dropdown (D9)
- Tìm kiếm trong nội dung hội thoại (D3)
- Nhập lịch sử `localStorage` cũ (D8)
- Ghi lịch sử từ server cho luồng AI chạy nền (D2)
