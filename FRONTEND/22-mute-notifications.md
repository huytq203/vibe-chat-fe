# 22 — Mute / Unmute thông báo theo conversation

> **Mục tiêu:** mỗi user bật/tắt thông báo (mute) riêng cho từng conversation (group/direct).
> Mute = **tắt tiếng**: không bị push ra điện thoại, nhưng tin nhắn vẫn về bình thường.

Endpoint require JWT. AuthZ: chỉ **member** của conversation. Liên quan:
[03-conversations.md](./03-conversations.md) (shape `Conversation`), [07-notifications.md](./07-notifications.md),
[08-websocket.md](./08-websocket.md).

---

## 1. Mute chặn cái gì? (đọc kỹ)

| Lớp | Khi mute |
|---|---|
| **Push FCM** (thông báo đẩy ra điện thoại) | ❌ **BỊ CHẶN** |
| **Notification in-app** (chuông `GET /notifications`) | ✅ vẫn tạo |
| **Realtime WS** (`message:new`, badge…) | ✅ vẫn nhận |
| **unreadCount** (số tin chưa đọc) | ✅ vẫn tăng |
| **@mention** (bị nhắc tên) | ✅ **VẪN push** dù đã mute |

> Tức là mute chỉ làm conversation **không làm phiền** (không rung/đẩy noti khi offline),
> nhưng user mở app vẫn thấy đủ tin + badge. Khi bị **nhắc tên** thì vẫn được push để không
> bỏ lỡ việc quan trọng.

---

## 2. Endpoint (đã ship ✅) — 1 toggle

```http
PATCH /api/v1/conversations/{conversationId}/mute
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Body — `MuteConversationDto`

```jsonc
{
  "isMuted": true,                          // bắt buộc
  "mutedUntil": "2026-06-06T09:00:00.000Z"  // tùy chọn (ISO, tương lai)
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `isMuted` | ✅ | `true` = mute, `false` = unmute |
| `mutedUntil` | — | Mốc **tự bật lại** (ISO, phải ở **tương lai**). Bỏ trống/null + `isMuted=true` = **mute vĩnh viễn**. Bỏ qua khi `isMuted=false`. |

### Các trường hợp

| Mục đích | Body |
|---|---|
| Mute vĩnh viễn | `{ "isMuted": true }` |
| Mute 8 tiếng | `{ "isMuted": true, "mutedUntil": "<now+8h ISO>" }` |
| Bật lại (unmute) | `{ "isMuted": false }` |

> **Preset duration do FE tự tính** (30 phút / 8 giờ / 1 tuần…). BE chỉ nhận mốc ISO —
> FE lấy `Date.now() + offset` rồi `.toISOString()`.

### Response — `200 OK`

Trả nguyên `ConversationResponseDto` (giống `PATCH :id/pin`) với 2 field mới:

```jsonc
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    // ... toàn bộ field Conversation như cũ ...
    "isPinned": false,
    "isLocked": false,
    "isMuted": true,                          // ⭐ đã normalize (xem §3)
    "mutedUntil": "2026-06-06T09:00:00.000Z"  // ⭐ null nếu mute vĩnh viễn / hết hạn
  }
}
```

---

## 3. `isMuted` / `mutedUntil` đã được **normalize**

BE tự xử lý hết hạn (lazy) — FE **không cần tính lại**:

- Mute vĩnh viễn → `isMuted=true`, `mutedUntil=null`.
- Mute có hạn còn hiệu lực → `isMuted=true`, `mutedUntil=<ISO>`.
- Mute có hạn **đã qua mốc** → BE trả `isMuted=false`, `mutedUntil=null` (dù DB chưa reset).

→ FE cứ tin thẳng `isMuted` để render icon 🔕. 2 field này có mặt ở **mọi** response trả
`Conversation`: `GET /conversations` (list), `GET /conversations/:id`, và response của chính
`PATCH :id/mute`. Không cần endpoint riêng để đọc trạng thái mute.

---

## 4. Realtime — đồng bộ đa thiết bị

Khi user mute/unmute trên 1 thiết bị, BE emit tới **mọi thiết bị của chính user đó**:

```ts
socket.on('conversation:mute_updated', (payload) => {
  // payload: { conversationId: string, isMuted: boolean, mutedUntil: string | null }
  // → cập nhật cache conversation tương ứng (icon mute, menu).
});
```

- Chỉ gửi cho **chính user** (mute là per-user), KHÔNG cho member khác trong nhóm.
- FE nên cập nhật optimistic ngay khi gọi API, rồi reconcile bằng response + event này.

---

## 5. Gợi ý FE

```ts
// chatApi
muteConversation(conversationId, { isMuted, mutedUntil }) =>
  PATCH /conversations/${conversationId}/mute  body { isMuted, mutedUntil }

// preset duration (FE tự tính ISO)
const muteFor = (ms: number) => new Date(Date.now() + ms).toISOString();
const PRESETS = {
  '30 phút': muteFor(30 * 60_000),
  '8 giờ':   muteFor(8 * 60 * 60_000),
  '1 tuần':  muteFor(7 * 24 * 60 * 60_000),
  'Vĩnh viễn': null,
};

// mutation — optimistic + reconcile
const mute = useMutation({
  mutationFn: (mutedUntil) =>
    chatApi.muteConversation(conversationId, { isMuted: true, mutedUntil }),
  onSuccess: (res) => updateConversationCache(res.data), // isMuted/mutedUntil đã normalize
});
const unmute = () =>
  chatApi.muteConversation(conversationId, { isMuted: false });
```

- Icon 🔕 cạnh tên conversation khi `isMuted === true`.
- Với mute có hạn, FE có thể show tooltip "Tắt đến <format(mutedUntil)>".
- Lắng nghe `conversation:mute_updated` để đồng bộ các tab/thiết bị khác.

---

## 6. Lỗi thường gặp

| Tình huống | HTTP | `error.code` |
|---|---|---|
| Thiếu `isMuted` / sai kiểu | 400 | `VALIDATION_ERROR` |
| `mutedUntil` không phải ISO / ở **quá khứ** | 400 | `VALIDATION_ERROR` |
| Không phải member | 403 | `CONVERSATION_MEMBER_REQUIRED` |
| Conversation không tồn tại | 404 | `CONVERSATION_NOT_FOUND` |

---

## 7. Tiêu chí nghiệm thu

- [x] `PATCH :id/mute { isMuted: true }` → response `isMuted=true`, conversation list cũng phản ánh.
- [x] Mute rồi: người khác gửi tin → **không** nhận push FCM, NHƯNG vẫn có in-app noti + badge tăng.
- [x] Bị **@mention** trong conversation đã mute → **vẫn** nhận push.
- [x] Mute có hạn: qua mốc `mutedUntil` → push hoạt động lại; response trả `isMuted=false`.
- [x] `{ isMuted: false }` → unmute, push bình thường.
- [x] `mutedUntil` ở quá khứ → `400`.
- [x] Mute ở thiết bị A → thiết bị B nhận `conversation:mute_updated`.
- [x] Chỉ member thao tác được; người ngoài → `403`/`404`.
