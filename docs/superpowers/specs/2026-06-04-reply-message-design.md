# Reply tin nhắn — Design Spec

**Ngày:** 2026-06-04
**Feature:** chat
**Phạm vi:** FE-only (BE đã hỗ trợ sẵn `replyToMessageId`)

## Mục tiêu

Cho phép người dùng trả lời (reply) một tin nhắn cụ thể trong conversation. Tin reply
hiển thị khối trích dẫn (quoted preview) của tin gốc; bấm vào trích dẫn sẽ cuộn tới
tin gốc và nháy sáng.

## Bối cảnh & nền tảng có sẵn

- `Message.replyToMessageId: string | null` và `SendMessageInput.replyToMessageId?` đã
  tồn tại trong `features/chat/types.ts`.
- `chatApi.sendMessage` đã gửi `replyToMessageId` lên BE (`services/chat.api.ts`).
- BE **chỉ trả về** `replyToMessageId` (không kèm preview lồng nhau) → FE tự tra tin gốc
  từ cache (các trang đã load của infinite query).
- **Không có** endpoint GET 1 tin theo id → khi tin gốc ngoài cache, degrade graceful.
- Pattern tham chiếu: `stores/message-edit.store.ts` + banner "Đang chỉnh sửa" trong
  `MessageInput` — reply dùng lại đúng pattern này.

## Quyết định thiết kế (đã chốt với user)

1. **Entry point:** menu dropdown (`MessageActions`) hiện trên **mọi tin**. "Trả lời"
   luôn có; "Sửa/Sao chép/Gỡ" chỉ tin của mình.
2. **Bấm khối trích dẫn:** cuộn tới tin gốc + nháy sáng (~1.6s).
3. **Fallback khi tin gốc ngoài cache:** quote tối giản ("Tin nhắn gốc không còn trong
   khung nhìn") + toast khi bấm. Không thêm endpoint BE mới.
4. **E2E:** không cho reply (nhất quán với menu hiện tại).
5. **Reply & Edit loại trừ lẫn nhau.**

## Các đơn vị (units)

### a) `stores/message-reply.store.ts` (mới)

Bản sao của `message-edit.store.ts`.

```ts
type ReplyingMessage = {
  conversationId: string;
  messageId: string;
  senderName: string;   // "Bạn" nếu là tin của mình
  snippet: string;      // preview ngắn để render banner
  type: MessageType;
};
// state: replying: ReplyingMessage | null
// actions: startReply(msg), cancelReply()
```

Snapshot sẵn `senderName` + `snippet` để banner render ngay, không tra lại.

### b) `utils.ts` — thêm `getMessageSnippet(message): string`

- TEXT → `plaintext` / `contentPreview`
- media → `[Hình ảnh]` / `[Video]` / `[Âm thanh]` / `[Tệp]`
- đã gỡ (`isDeleted`) → `Tin nhắn đã thu hồi`
- E2E → `Tin nhắn mã hoá`

Dùng chung cho banner soạn (store snapshot) lẫn `ReplyQuote`.

### c) `components/messages/MessageActions.tsx` (sửa)

- Thêm item **"Trả lời"** ở đầu menu → gọi `startReply(snapshot)` và
  `useMessageEditStore.getState().cancelEdit()` (loại trừ edit).
- Nhận thêm prop `senderName` + `isMe` để dựng snapshot.
- Menu **hiện cho mọi tin** (điều kiện gating chuyển lên `MessageBubble`).
- "Sửa/Sao chép/Gỡ" vẫn gate bằng `isMe`; handler "Sửa" gọi thêm
  `useMessageReplyStore.getState().cancelReply()`.

### d) `components/messages/MessageBubble.tsx` (sửa)

- Điều kiện hiện `MessageActions`: bỏ ràng buộc `isMe`, giữ
  `!isSending && !isFailed && !message.isDeleted && !isE2E`.
- Đặt menu đúng phía: tin của mình → trái bubble; tin người khác → phải bubble.
- Thêm `data-message-id={message.id}` trên div ngoài cùng (để `scrollToMessage` tra).
- Render `<ReplyQuote>` phía trên `BubbleContent` khi `message.replyToMessageId`.
- Nhận prop `repliedTo: Message | null`, `repliedToName: string | null`,
  `onQuoteClick: (id: string) => void`, `isHighlighted: boolean`.
- `isHighlighted` → hiệu ứng nháy sáng (ring/bg pulse) trên bubble.

### e) `components/messages/ReplyQuote.tsx` (mới)

Props: `repliedTo: Message | null`, `repliedToName: string | null`,
`replyToMessageId: string`, `isMe: boolean`, `onClick: (id) => void`.

- Render: vạch màu bên trái + tên người gửi gốc + snippet (`getMessageSnippet`).
- Bấm → `onClick(replyToMessageId)`.
- `repliedTo === null` → bản tối giản "Tin nhắn gốc không còn trong khung nhìn";
  bấm vẫn gọi `onClick` (→ toast ở `MessageList`).

### f) `components/messages/MessageList.tsx` (sửa — điều phối)

- `messageById = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages])`.
- Truyền vào mỗi bubble:
  `repliedTo={m.replyToMessageId ? messageById.get(m.replyToMessageId) ?? null : null}`
  và `repliedToName` (tra `memberNames` theo `repliedTo.senderId`).
- `highlightId` state + `scrollToMessage(id)`:
  `scrollRef.current.querySelector('[data-message-id="…"]')` → `scrollIntoView({block:'center'})`,
  `setHighlightId(id)`, clear sau ~1.6s. Không tìm thấy → `toast` (fallback ngoài khung nhìn).
- Truyền `onQuoteClick={scrollToMessage}` + `isHighlighted={highlightId === m.id}`.

### g) `hooks/useMessageComposer.ts` + `components/messages/MessageInput.tsx` (sửa)

- Đọc `replying` từ store; `isReplying = Boolean(replying) && replying.conversationId === conversationId && !isEditing`.
- Banner "Đang trả lời {senderName}: {snippet}" + nút X (`cancelReply`), giống banner edit.
- `submit()`: gắn `replyToMessageId: replying?.messageId` vào `send.mutate`.
  - TEXT path: gắn trực tiếp.
  - Media path: chỉ gắn vào **tin đầu tiên** (cờ `replyUsed`, mirror logic `captionUsed`).
  - Gửi xong → `cancelReply()`.
- Effect đổi conversation → `cancelReply()` (như cleanup edit).

### h) `hooks/use-mutations.ts` (sửa nhỏ)

`onMutate` của send: optimistic message thêm `replyToMessageId` → quote hiện ngay.

## Luồng dữ liệu

Bấm "Trả lời" → `startReply(snapshot)` → banner ở input → gõ + Enter →
`send.mutate({…, replyToMessageId})` → optimistic bubble có quote → `cancelReply()`.
Render: mỗi bubble tra tin gốc từ `messageById` → `ReplyQuote`. Bấm quote →
`scrollToMessage` → cuộn + nháy sáng.

## Lỗi & edge cases

- Tin gốc ngoài cache → quote tối giản + toast.
- Reply tin đã gỡ → snippet "Tin nhắn đã thu hồi".
- E2E → không cho reply.
- Reply + Edit không cùng lúc (loại trừ ở action handler).

## Test

- Unit: `getMessageSnippet` (text / media / deleted / e2e).
- Component: `MessageActions` hiện "Trả lời" cho tin người khác; banner reply hiện/ẩn;
  `submit` gắn đúng `replyToMessageId`.

## Ngoài phạm vi (YAGNI)

- Reply tin E2E.
- Fetch tin gốc qua endpoint mới khi ngoài cache.
- Swipe-to-reply / nút reply nhanh khi hover (chỉ dùng menu dropdown).
