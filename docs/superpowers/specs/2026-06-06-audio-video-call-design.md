# Spec — Audio / Video Call (1-1) + cửa sổ nổi kéo thả

> Ngày: 2026-06-06
> Nguồn yêu cầu: [FRONTEND/23-calls.md](../../../FRONTEND/23-calls.md)
> Tuân thủ: [.claude/CLAUDE.md](../../../.claude/CLAUDE.md) (tech stack, cấu trúc feature, wrap lib, §15 hỏi trước khi thêm lib/env).

## 1. Mục tiêu & phạm vi

**Trong phạm vi (đợt này):** Cuộc gọi **1-1** audio và video, trọn vòng đời:
initiate → đổ chuông (caller "đang gọi" / callee "cuộc gọi đến") → accept / decline / cancel →
trong cuộc gọi (mute mic, tắt/bật cam) → hangup. Media qua LiveKit. UI là **cửa sổ nổi**
kéo thả được, 3 trạng thái **mini / normal / fullscreen**.

**Ngoài phạm vi (đợt sau):** Group call (≥3). Kiến trúc vẫn chừa chỗ qua event
`call:participant_joined/left` và store dạng list participants, nhưng UI grid và logic join
giữa chừng chưa làm.

## 2. Nguyên tắc nền (theo spec §0)

Hai kênh **tách biệt**, không nhầm:
1. **Socket `/call`** — chỉ báo hiệu (ring/accept/decline/cancel/hangup + sự kiện trạng thái).
   Là **namespace riêng**, KHÔNG dùng chung socket `/chat`.
2. **LiveKit** — luồng media thật. `livekitUrl` + `livekitToken` lấy từ **ack** của
   `call:initiate` / `call:accept` (KHÔNG cần env LiveKit; KHÔNG đi qua BE).

**Nguồn sự thật "call kết thúc" = event `call:ended`** từ BE (do webhook LiveKit), không phải
client tự quyết. FE luôn nghe `call:ended` để đóng UI + `room.disconnect()`.

## 3. Quyết định kiến trúc đã chốt

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| "Tách rời màn" | Overlay nổi trong app qua **React Portal → `document.body`** | Đơn giản, chạy mọi trình duyệt, không phụ thuộc Document PiP API |
| Phóng to/thu nhỏ | **3 trạng thái cố định** mini / normal / fullscreen (toggle) | Không cần resize tự do → bớt edge-case layout video |
| Kéo thả | **`react-draggable`** (drag-only) + prop `nodeRef` | Nhẹ hơn `react-rnd`; tương thích React 19 (đã bỏ `findDOMNode`) |
| LiveKit Room instance | Giữ ở **module singleton** trong `lib/livekit/room.ts`, KHÔNG để trong Zustand | Room là class instance, không serialize; tránh re-render |
| Call socket URL | Thêm env `NEXT_PUBLIC_CALL_WS_URL` | Namespace `/call` khác `/chat`; livekit URL thì lấy từ ack |

**Đã được user duyệt:** cài `react-draggable`, thêm env `NEXT_PUBLIC_CALL_WS_URL`.

## 4. Dependencies mới

- `livekit-client` — SDK media (track mic/cam, render video). Wrap trong `lib/livekit/`.
- `react-draggable` — kéo thả cửa sổ nổi (dùng `nodeRef` cho React 19).
- `socket.io-client` — đã có (v4.8.3), tái dùng cho namespace `/call`.

## 5. Cấu trúc file (theo CLAUDE.md §2, §7)

```
src/lib/ws/call-socket.ts        # wrap socket.io namespace /call (singleton: getCallSocket/closeCallSocket/setCallTokenProvider/refreshCallSocketAuth)
src/lib/livekit/room.ts          # wrap livekit-client: joinRoom/leaveRoom/setMic/setCam + đăng ký callback track
src/services/call.api.ts         # REST transport (chỉ GET): listCallHistory, getCall
src/services/keys.ts             # + callKeys (history, detail)
src/features/call/
  types.ts                       # Call, CallType, CallPhase, CallEndReason, CallTokenAck, CallParticipant, WindowMode
  schemas.ts                     # zod parse ack + event payload (validate boundary §10)
  stores/call.store.ts           # Zustand: phase, call metadata, window{mode,x,y}, micOn, camOn, participants
  hooks/
    useCallRealtime.ts           # mount 1 lần ở root; nghe call:incoming/accepted/declined/cancelled/ended/participant_*
    useCallActions.ts            # startCall/accept/decline/cancel/hangup/toggleMic/toggleCam (emit socket + drive livekit + store)
    useLiveKitRoom.ts            # lifecycle Room; attach/detach track local + remote; cập nhật refs để render
    use-query.ts                 # useCallHistory (REST, optional dùng ngay)
  components/
    CallContainer.tsx            # host Portal(body); switch render theo store.phase
    IncomingCallDialog.tsx       # màn đổ chuông đến (Bắt máy / Từ chối)
    OutgoingRinging.tsx          # màn "Đang gọi…" (Huỷ) — có thể gộp trong CallWindow phase=outgoing
    CallWindow.tsx               # khung cửa sổ nổi (drag + 3 trạng thái) — < 200 dòng
    CallStage.tsx                # vùng render <video>/<audio> local + remote
    CallControls.tsx             # nút mic / cam / hangup / đổi-size
    CallButtons.tsx              # 2 nút gọi audio/video gắn vào ChatHeader (chỉ hiện ở conversation DIRECT)
  utils.ts                       # formatDuration, mapCallErrorCode → message tiếng Việt
  index.ts                       # export tường minh (CallButtons, CallContainer, useCallRealtime)
```

## 6. Hợp đồng sự kiện (từ spec §3)

**FE → BE (emit có ack callback):**
- `call:initiate { conversationId, type }` → `CallTokenAck`
- `call:accept { callId }` → `CallTokenAck`
- `call:decline { callId, reason? }` → `{ ok }`
- `call:cancel { callId }` → `{ ok }`
- `call:leave { callId }` → `{ ok }`

`type`: `'AUDIO' | 'VIDEO'`. `CallTokenAck` chứa `livekitUrl`, `livekitToken`, `room`, `callId`, `status`, `participants`...

**BE → FE (nghe):**
- `call:incoming { callId, conversationId, initiatorId, type, room }` → đổ chuông đến
- `call:accepted { callId, by }` → caller vào call
- `call:declined { callId, by, reason }` → caller dừng
- `call:cancelled { callId }` → callee tắt chuông
- `call:participant_joined { callId, userId }` / `call:participant_left { callId, userId }` → (group, đợt sau)
- `call:ended { callId, reason, durationSec }` → đóng UI + disconnect

`reason` của `ended`: `COMPLETED | MISSED | DECLINED | CANCELLED | TIMEOUT | BUSY | FAILED`.

## 7. State machine (call.store.ts)

`phase`: `'idle' | 'outgoing' | 'incoming' | 'ongoing'`.

```
idle ──startCall──► outgoing ──call:accepted──► ongoing ──hangup/call:ended──► idle
idle ──call:incoming──► incoming ──accept──► ongoing
                              └──decline / call:cancelled──► idle
outgoing ──call:declined / cancel / call:ended──► idle
```

Store giữ (serialize được):
- `phase`, `call: { callId, conversationId, type, peer: {id,name,avatar} } | null`
- `window: { mode: 'mini'|'normal'|'fullscreen', x: number, y: number }`
- `micOn: boolean`, `camOn: boolean`
- `participants: CallParticipant[]` (cho group đợt sau)
- `startedAt: number | null` (để tính timer; set khi vào `ongoing`)

LiveKit `Room` KHÔNG ở store — ở singleton `lib/livekit/room.ts`.

## 8. Luồng chi tiết

**Caller:** `CallButtons` → `startCall(conversationId, type)`:
1. emit `call:initiate` → nhận ack. Lỗi `ok:false` → toast theo `code`, dừng.
2. set store phase=`outgoing`, lưu peer; bắt đầu **timer ring 45s** (timeout → đóng cục bộ, BE sẽ bắn `ended/MISSED`).
3. `joinRoom(ack.livekitUrl, ack.livekitToken, { video: type==='VIDEO' })`.
4. nghe `call:accepted` → phase=`ongoing`, `startedAt=now`, dừng timer ring.

**Callee:** event `call:incoming` → store phase=`incoming` (peer = initiator). `IncomingCallDialog`:
- Accept → emit `call:accept` → ack → `joinRoom` → phase=`ongoing`.
- Decline → emit `call:decline` → phase=`idle`.
- Nghe `call:cancelled` khi chưa kịp bắt máy → phase=`idle`.

**Kết thúc:** `hangup` → `leaveRoom()` + emit `call:leave` + reset store. Đồng thời **luôn** nghe
`call:ended` → `leaveRoom()` + reset store (phòng khi không bấm hangup). `reason==='MISSED'` → toast "Cuộc gọi nhỡ".

## 9. Cửa sổ nổi — UI

- **Render qua `createPortal(document.body)`** trong `CallContainer`.
- **Mini** (~180×100): pill góc dưới-phải; hiện avatar peer + timer + nút hangup nhanh; kéo thả được.
- **Normal** (~360×520): cửa sổ nổi; kéo bằng thanh header; bounds trong viewport; đủ controls.
- **Fullscreen**: phủ viewport; KHÔNG kéo; ẩn nút drag.
- Toggle 3 trạng thái bằng nút trong `CallControls`. Vị trí `(x,y)` lưu trong store suốt phiên.
- Drag: `react-draggable` với `nodeRef`, chỉ bật ở mini/normal, `bounds="body"`.
- `CallStage`: video mode → grid local (PiP nhỏ) + remote (lớn); audio mode → avatar lớn + sóng/timer.
  Track attach/detach qua `useLiveKitRoom` (dùng `track.attach()`/`detach()` của LiveKit vào `<div ref>`).

## 10. Tích hợp điểm mount

- `src/features/chat/components/layout/ChatLayout.tsx`: thêm `useCallRealtime()` và render `<CallContainer/>`
  (cạnh `useChatRealtime`, `useNotificationRealtime`).
- `src/features/chat/components/layout/ChatHeader.tsx`: thêm `<CallButtons conversation={...} />`
  (chỉ hiện audio/video khi `conversation.type === 'DIRECT'`).
- `useCallRealtime` khởi tạo call-socket (token provider = `apiAuth.getToken()`, refresh khi token đổi —
  giống `useChatRealtime`).

## 11. Env & config (§15 — đã được duyệt)

- `src/config/env.ts`: thêm `NEXT_PUBLIC_CALL_WS_URL: z.string().url()`.
- `.env`: `NEXT_PUBLIC_CALL_WS_URL=http://localhost:3005/call`.
- KHÔNG thêm env LiveKit (lấy từ ack).

## 12. Lỗi & edge-case (spec §7, §8)

- Map ack `code` → toast tiếng Việt: `CALL_CALLEE_BUSY`→"Máy bận", `CALL_ALREADY_ENDED`→đóng UI đổ chuông,
  `CALL_NOT_FOUND`/`CALL_NOT_PARTICIPANT`/`FORBIDDEN`/`CONVERSATION_MEMBER_REQUIRED`→toast lỗi,
  `AUTH_TOKEN_INVALID`→refresh token + reconnect.
- `getUserMedia` bị chặn (không cấp mic/cam) → toast "Cần quyền micro/camera" + kết thúc cục bộ.
- **Ring timeout UI ~45s** khớp `CALL_RING_TIMEOUT_SEC`.
- Mất mạng: call-socket reconnect (reconnection: true); LiveKit auto-reconnect riêng.
- Tab close / refresh: `pagehide`/`beforeunload` → `closeCallSocket()` + `leaveRoom()`.
- Token call có TTL ~2h, không refresh giữa call.

## 13. Bảo mật (§10)

- Token access truyền qua `auth.token` của handshake (không log token).
- Validate payload event/ack từ BE bằng zod (`schemas.ts`) trước khi đưa vào store.
- Không có secret phía client; LiveKit token là JWT ngắn hạn từ BE.

## 14. Testing (§11)

- **Unit (Vitest):** `formatDuration`, `mapCallErrorCode`, transitions của `call.store`
  (idle→outgoing→ongoing→idle; incoming→ongoing; incoming→idle).
- **Component (Testing Library):** `CallControls` (toggle mic/cam gọi đúng action), `CallWindow`
  (đổi 3 trạng thái mini/normal/fullscreen), `IncomingCallDialog` (Bắt máy/Từ chối emit đúng).
- **Mock:** `lib/ws/call-socket` và `lib/livekit/room` (không gọi BE/LiveKit thật).

## 15. Ràng buộc CLAUDE.md cần giữ khi code

- Mọi component < 200 dòng (tách `CallWindow`/`CallStage`/`CallControls`).
- Không `any`; phân định Server/Client (`'use client'` ở component cần state/effect).
- Fetch REST qua `services/call.api.ts`; query key ở `services/keys.ts` (callKeys).
- Wrap `livekit-client` + socket `/call` trong `lib/`; feature không import trực tiếp.
- Import path alias `@/...`; export tường minh ở `index.ts`.

## 16. Thứ tự triển khai đề xuất (cho bước writing-plans)

1. Deps + env (`livekit-client`, `react-draggable`, `NEXT_PUBLIC_CALL_WS_URL`).
2. `lib/ws/call-socket.ts` + `lib/livekit/room.ts` (wrapper, có thể test mock).
3. `services/call.api.ts` + `callKeys`; `features/call/types.ts` + `schemas.ts`.
4. `stores/call.store.ts` (+ unit test state machine).
5. `hooks/useCallRealtime.ts`, `useCallActions.ts`, `useLiveKitRoom.ts`.
6. UI: `CallContainer` → `CallWindow` + `CallStage` + `CallControls` + `IncomingCallDialog` + `OutgoingRinging`.
7. `CallButtons` + mount vào `ChatHeader` & `ChatLayout`.
8. Tests + `tsc --noEmit` + lint.
