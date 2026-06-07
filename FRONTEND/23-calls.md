# 23 — Audio / Video Call (LiveKit + Socket.IO)

> **Mục tiêu:** FE gọi audio/video 1-1 và group (≥3 người) trong vibe-chat.
> **Nguyên tắc:** BE chỉ lo **báo hiệu** (ai gọi ai, đổ chuông, accept/decline) + **cấp LiveKit token**.
> **Media (mic/cam/loa) do LiveKit lo** — FE nói chuyện **trực tiếp** với LiveKit qua `livekit-client`, KHÔNG đi qua BE.

Liên quan: [08-websocket.md](./08-websocket.md) (cách connect socket + auth),
[05-presence.md](./05-presence.md), [07-notifications.md](./07-notifications.md), [12-error-codes.md](./12-error-codes.md).

---

## 0. Bức tranh tổng thể (đọc kỹ trước khi code)

```
 CALLER                              CALLEE
   │ socket /call                      │ socket /call (đã connect sẵn)
   │ emit call:initiate ──────► BE ────┤ on call:incoming  (đổ chuông)
   │ ◄─ ack {livekitUrl, token, room}  │ emit call:accept ──► BE
   │                                   │ ◄─ ack {livekitUrl, token, room}
   ▼                                   ▼
 LiveKitRoom.connect(url, token)   LiveKitRoom.connect(url, token)
   └──────── media RTP/UDP ngang hàng qua SFU ────────┘
                          │
   webhook participant_joined/left/room_finished ──► BE cập nhật trạng thái
                          │
   BE broadcast call:participant_joined / call:ended … ──► cả 2 FE
```

**2 kênh tách biệt, đừng nhầm:**
1. **Socket `/call`** — chỉ báo hiệu (ring/accept/decline/hangup + sự kiện trạng thái). Là namespace **riêng**, KHÔNG dùng chung socket `/chat`.
2. **LiveKit connection** — luồng media thật, mở bằng `livekit-client` với `{ livekitUrl, livekitToken }` mà BE trả về.

> **Nguồn sự thật cho "call đã kết thúc" = webhook LiveKit**, không phải client tự báo. FE cứ
> hiển thị theo event `call:ended` mà BE bắn xuống.

---

## 1. Dependencies FE

```bash
npm i livekit-client      # SDK media (track mic/cam, render video)
npm i socket.io-client    # nếu chưa có (đã dùng cho /chat)
```

---

## 2. Kết nối namespace `/call`

Mỗi user khi vào app (đã đăng nhập) nên **mở sẵn** socket `/call` để **nhận cuộc gọi đến** bất cứ lúc nào — y hệt cách mở `/chat`.

```ts
import { io, Socket } from 'socket.io-client';

const callSocket: Socket = io('wss://chat.basetech.io.vn/call', {
  // hoặc ws://localhost:3005/call khi dev
  transports: ['websocket'],
  auth: { token: accessToken }, // BE đọc handshake.auth.token (xem 08-websocket.md)
});

callSocket.on('connect', () => console.log('[/call] connected'));
callSocket.on('error', (e) => console.warn('[/call] error', e)); // {code, message}
```

- **Auth:** truyền `accessToken` qua `auth.token` (ưu tiên), hoặc `?token=` query, hoặc header `Authorization: Bearer`.
- Token sai/thiếu → server emit `error` rồi `disconnect`. FE nên refresh token và reconnect.
- Khi connect thành công, BE **tự cho socket join room theo userId** → bạn nhận được `call:incoming` trên **mọi thiết bị** đang mở app.

---

## 3. Hợp đồng sự kiện (Event Contract)

### 3.1 FE → BE (đều có **ack callback**)

| Event | Payload | Ack trả về |
|---|---|---|
| `call:initiate` | `{ conversationId, type }` | `CallTokenAck` |
| `call:accept` | `{ callId }` | `CallTokenAck` |
| `call:decline` | `{ callId, reason? }` | `{ ok: true }` |
| `call:cancel` | `{ callId }` | `{ ok: true }` |
| `call:leave` | `{ callId }` | `{ ok: true }` |

- `type`: `'AUDIO'` | `'VIDEO'`.
- `conversationId`: **UUID** conversation (gọi cả direct lẫn group đều qua conversation).
- `reason`: lý do từ chối (tuỳ chọn, ≤200 ký tự).

**Ack thành công** (`CallTokenAck`) cho `initiate` / `accept`:
```jsonc
{
  "ok": true,
  "callId": "uuid",
  "conversationId": "uuid",
  "type": "VIDEO",
  "initiatorId": "<keycloakId>",
  "status": "RINGING",          // initiate=RINGING; accept=ONGOING
  "participants": [ { "userId": "...", "state": "JOINED|RINGING|...", "joinedAt": null, "leftAt": null } ],
  "endReason": null,
  "durationSec": 0,
  "answeredAt": null,
  "endedAt": null,
  "createdAt": "ISO",
  "livekitUrl": "wss://livekit.basetech.io.vn",  // ⭐ dùng để connect LiveKit
  "livekitToken": "<JWT>",                        // ⭐ token vào room
  "room": "call_<callId>"
}
```

**Ack lỗi** (mọi event):
```jsonc
{ "ok": false, "code": "CALL_CALLEE_BUSY", "message": "Người nhận đang trong cuộc gọi khác" }
```

> ⚠️ Đây là **ack của Socket.IO** (callback đối số thứ 2 của `emit`), KHÔNG phải response envelope REST.

### 3.2 BE → FE (lắng nghe)

| Event | Payload | Khi nào |
|---|---|---|
| `call:incoming` | `{ callId, conversationId, initiatorId, type, room }` | Có người gọi bạn → **hiện màn hình đổ chuông** |
| `call:accepted` | `{ callId, by }` | Một callee đã bắt máy → caller tắt chuông, vào call |
| `call:declined` | `{ callId, by, reason }` | 1 người từ chối. **Chỉ gửi tới initiator.** Trong group đây chỉ là 1 người rời — call **vẫn tiếp tục** (xem 5.4) |
| `call:cancelled` | `{ callId }` | Caller huỷ trước khi ai bắt máy → callee tắt chuông. **Cũng bắn khi caller đóng tab / mất kết nối lúc đang đổ chuông** |
| `call:participant_joined` | `{ callId, userId }` | 1 người vào room (group) — cập nhật danh sách |
| `call:participant_left` | `{ callId, userId }` | 1 người rời room |
| `call:ended` | `{ callId, reason, durationSec }` | Call kết thúc → **đóng UI call**, ngắt LiveKit |

`reason` của `call:ended`: `COMPLETED` \| `MISSED` \| `DECLINED` \| `CANCELLED` \| `TIMEOUT` \| `BUSY` \| `FAILED`.

> **Idempotent — luôn lắng nghe `call:ended`:** một số tình huống bạn sẽ nhận **nhiều** event chốt (vd `call:declined` rồi `call:ended` ở 1-1, hoặc `call:cancelled` + `call:ended`). FE cứ coi `call:ended` là tín hiệu đóng UI cuối cùng; các event kia chỉ để cập nhật trạng thái phụ. Đóng UI 2 lần phải an toàn (no-op lần sau).

---

## 4. Kết nối LiveKit (luồng media)

Sau khi có `{ livekitUrl, livekitToken }` từ ack `initiate`/`accept`:

```ts
import { Room, RoomEvent, Track, createLocalTracks } from 'livekit-client';

async function joinLiveKit(livekitUrl: string, token: string, isVideo: boolean) {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  // Render video/audio của người khác
  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    if (track.kind === Track.Kind.Video) {
      const el = track.attach();           // <video> element
      document.getElementById('remote')?.appendChild(el);
    } else if (track.kind === Track.Kind.Audio) {
      track.attach();                      // tự phát audio
    }
  });
  room.on(RoomEvent.Disconnected, () => closeCallUi());

  await room.connect(livekitUrl, token);

  // Bật mic (+ cam nếu video) và publish
  const tracks = await createLocalTracks({ audio: true, video: isVideo });
  for (const t of tracks) await room.localParticipant.publishTrack(t);

  // Hiện local video preview
  const camTrack = tracks.find((t) => t.kind === Track.Kind.Video);
  if (camTrack) document.getElementById('local')?.appendChild(camTrack.attach());

  return room;
}
```

**Khi kết thúc:** `await room.disconnect()` + detach các element. Đồng thời emit `call:leave` cho BE (xem dưới).

> Mute/unmute mic: `room.localParticipant.setMicrophoneEnabled(false/true)`.
> Tắt/bật cam: `room.localParticipant.setCameraEnabled(false/true)`.
> Đây là API của LiveKit, **không cần gọi BE**.

---

## 5. Luồng đầy đủ

### 5.1 Caller (người gọi)

```ts
async function startCall(conversationId: string, type: 'AUDIO' | 'VIDEO') {
  callSocket.emit('call:initiate', { conversationId, type }, async (ack) => {
    if (!ack.ok) return showError(ack.code, ack.message); // vd CALL_CALLEE_BUSY
    showOutgoingRingingUi(ack.callId);                    // "Đang gọi…"
    const room = await joinLiveKit(ack.livekitUrl, ack.livekitToken, type === 'VIDEO');
    currentCall = { callId: ack.callId, room };
  });
}

// Đối phương bắt máy
callSocket.on('call:accepted', ({ callId }) => switchToInCallUi(callId));
// Đối phương từ chối / bận
callSocket.on('call:declined', ({ reason }) => { endLocalCall(); toast('Đã từ chối'); });

// Caller huỷ khi đang đổ chuông (chưa ai bắt máy)
function cancelCall(callId: string) {
  callSocket.emit('call:cancel', { callId }, () => endLocalCall());
}
```

### 5.2 Callee (người nhận)

```ts
callSocket.on('call:incoming', (c) => {
  // c = { callId, conversationId, initiatorId, type, room }
  showIncomingRingingUi(c); // hiện nút Bắt máy / Từ chối
});

function acceptCall(callId: string, isVideo: boolean) {
  callSocket.emit('call:accept', { callId }, async (ack) => {
    if (!ack.ok) return showError(ack.code, ack.message); // vd CALL_ALREADY_ENDED
    const room = await joinLiveKit(ack.livekitUrl, ack.livekitToken, isVideo);
    currentCall = { callId, room };
    switchToInCallUi(callId);
  });
}

function declineCall(callId: string, reason?: string) {
  callSocket.emit('call:decline', { callId, reason }, () => closeIncomingUi());
}

// Caller huỷ khi mình chưa kịp bắt máy
callSocket.on('call:cancelled', ({ callId }) => closeIncomingUi());
```

### 5.3 Trong cuộc gọi — rời / kết thúc

```ts
async function hangup(callId: string) {
  await currentCall?.room.disconnect(); // ngắt media
  callSocket.emit('call:leave', { callId }, () => {});
  closeCallUi();
}

// BE chốt kết thúc (nguồn sự thật) — luôn nghe event này để đóng UI cho chắc
callSocket.on('call:ended', ({ callId, reason, durationSec }) => {
  currentCall?.room.disconnect();
  closeCallUi();
  if (reason === 'MISSED') toast('Cuộc gọi nhỡ');
});
```

### 5.4 Group call (≥3 người)

- Vẫn gọi `call:initiate` với `conversationId` của group.
- Nếu group **đã có call đang chạy**, BE **không tạo call mới** mà trả token để bạn **join thẳng** call hiện tại (ack vẫn dạng `CallTokenAck`, `status: 'ONGOING'`).
- Theo dõi người vào/ra bằng `call:participant_joined` / `call:participant_left` để cập nhật lưới video.
- Mỗi người tự `call:leave` khi thoát. Khi còn <2 người (và không còn ai đổ chuông), BE tự kết thúc call.

**Khác biệt 1-1 vs group khi `call:decline`:**

| | 1-1 (2 người) | Group (>2 người) |
|---|---|---|
| 1 người bấm từ chối | **Kết thúc cả call** → `call:ended (DECLINED)` | Chỉ **người đó rời**; call vẫn tiếp tục cho người khác. Initiator nhận `call:declined` |
| Khi nào group mới kết thúc do từ chối | — | Khi **không còn ai đang đổ chuông** và **<2 người đã join** (tức tất cả từ chối, không ai bắt máy) → `call:ended (DECLINED)` |

→ FE group: khi nhận `call:declined`, **đừng đóng UI call**, chỉ cập nhật trạng thái participant đó. Chỉ đóng khi nhận `call:ended`.

### 5.5 Đóng tab / mất kết nối — BE tự dọn (không "chạy ngầm")

Khi socket `/call` **disconnect** (đóng tab, reload, mất mạng), BE tự xử lý — FE **không cần** làm gì thêm, nhưng nên hiểu để hiển thị đúng:

| Tình huống | BE làm gì | Event người khác nhận |
|---|---|---|
| **Caller** đóng tab khi đang đổ chuông | Huỷ call | `call:cancelled` |
| Đang trong call, 1 người đóng tab (còn ≥2 người) | Đánh dấu người đó rời | `call:participant_left` |
| Đang trong call, đóng tab làm còn <2 người | Kết thúc call | `call:ended (COMPLETED)` |

- **Multi-device:** nếu bạn mở call ở 2 tab/thiết bị, đóng **1** tab sẽ **không** kết thúc call (BE thấy vẫn còn device khác của bạn trong call).
- **Webhook là lưới an toàn:** kể cả khi FE **quên** emit `call:leave` (chỉ ngắt LiveKit), LiveKit báo `participant_left`/`room_finished` về BE → BE vẫn kết thúc call và bắn `call:ended`. Dù vậy **vẫn nên** emit `call:leave` để kết thúc **tức thì** thay vì chờ webhook.

---

## 6. REST — lịch sử & chi tiết (cần JWT)

```http
GET /api/v1/calls/history?conversationId=<uuid>&page=1&limit=20
GET /api/v1/calls/{callId}
Authorization: Bearer <accessToken>
```

- `history`: danh sách call mà bạn là participant (mới nhất trước). `conversationId` tuỳ chọn để lọc theo 1 hội thoại.
- `detail`: chi tiết 1 call (phải là participant, nếu không → `CALL_NOT_PARTICIPANT`).
- Trả về theo **response envelope** chuẩn (`{ success, data, ... }` — xem [02-response-envelope.md](./02-response-envelope.md)). `data` là `CallResponse` (giống ack nhưng **không** có `livekitUrl/livekitToken/room`).

> Mỗi call kết thúc/nhỡ còn sinh **1 tin nhắn hệ thống** loại `CALL` trong timeline conversation
> (preview kiểu "Cuộc gọi video • 5:23" / "Cuộc gọi nhỡ") → hiển thị như message bình thường,
> đến qua event `message:new` của socket `/chat` (xem [04-messages.md](./04-messages.md)).

---

## 7. Error codes (ack `code`)

| Code | Ý nghĩa | FE xử lý |
|---|---|---|
| `CALL_CALLEE_BUSY` | Người nhận (1-1) đang trong call khác | Toast "Máy bận" |
| `CALL_ALREADY_ENDED` | Accept một call đã kết thúc | Đóng UI đổ chuông |
| `CALL_NOT_FOUND` | callId không tồn tại | Đóng UI |
| `CALL_NOT_PARTICIPANT` | Không thuộc cuộc gọi (accept/cancel/detail) | Báo lỗi |
| `CONVERSATION_MEMBER_REQUIRED` / `FORBIDDEN` | Không phải member conversation khi initiate | Báo lỗi |
| `AUTH_TOKEN_INVALID` | Token sai/hết hạn | Refresh token → reconnect |

---

## 8. Checklist FE

- [ ] Mở socket `/call` ngay khi đăng nhập (để nhận `call:incoming` mọi lúc).
- [ ] Cài `livekit-client`, connect bằng `{ livekitUrl, livekitToken }` từ ack.
- [ ] Xin quyền **mic/cam** trước (browser permission) — gọi sẽ fail nếu user chặn.
- [ ] Luôn nghe `call:ended` để đóng UI + `room.disconnect()` (đừng chỉ dựa vào nút hangup). Đóng UI phải **idempotent** (nhận event chốt 2 lần vẫn an toàn).
- [ ] Đổ chuông có **timeout phía UI** ~45s khớp `CALL_RING_TIMEOUT_SEC` (BE tự set MISSED, bắn `call:ended`).
- [ ] Xử lý ack lỗi (`ok:false`) cho cả 5 event FE→BE.
- [ ] **Group:** khi nhận `call:declined` **KHÔNG** đóng UI (chỉ 1 người rời) — chỉ đóng khi `call:ended`. Render theo `participant_joined/left`; cho phép join giữa chừng.
- [ ] Vẫn emit `call:leave` khi thoát (dù BE có webhook backup) để kết thúc tức thì.
- [ ] Khi token hết hạn / mất mạng: reconnect socket `/call`; LiveKit có auto-reconnect riêng. (Đóng tab/mất kết nối → BE tự dọn, xem 5.5.)

---

## 9. Lưu ý hạ tầng

- LiveKit URL là **`wss://`** (vd `wss://livekit.basetech.io.vn`) — FE connect thẳng, không qua BE.
- Cần mở **UDP** ở client network để media chạy (LiveKit lo TURN fallback khi bị chặn UDP).
- Token có TTL (`CALL_TOKEN_TTL_SEC`, mặc định 2h) — đủ cho 1 cuộc gọi dài; không cần refresh giữa call.
