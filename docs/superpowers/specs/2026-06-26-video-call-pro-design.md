# Video Call Pro — Thiết kế (FE + BE)

Ngày: 2026-06-26
Phạm vi: `vibe-chat-fe` (FE) + `vibe-chat` (BE NestJS)

## Mục tiêu
Nâng tính năng gọi điện hiện tại lên mức "chuyên nghiệp":
1. Chuông báo mới (file nhạc thật, tách incoming/outgoing).
2. Chuyển Voice→Video cần **2 bên đồng ý** mới mở cam (1-1).
3. Push cuộc gọi đến lên **Firebase** (cả online + offline), kèm tên/avatar người gọi.
4. Bổ sung các tính năng LiveKit pro: screen share, background blur, device selection, connection quality, active speaker, mute-for-me, chat trong call.

Recording (Egress) **đã loại khỏi phạm vi**.

## Nền tảng hiện có (không viết lại, chỉ mở rộng)
- FE: `features/call/` (store `call.store.ts`, hooks `useCallRealtime/useCallActions/useLiveKitRoom`, components `CallContainer/CallWindow/CallStage/CallGrid/CallControls/IncomingCallDialog`), `ringtone.ts` (WebAudio beep).
- FE wrappers: `lib/livekit/room.ts`, `lib/ws/call-socket.ts` (namespace `/call`), `lib/firebase/messaging.ts`, `public/firebase-messaging-sw.js`.
- BE: `modules/calls/` (gateway `/call`, service, broadcaster, livekit.service), `modules/notifications/` (fcm.service, notifications.service). Call lưu MongoDB.

## Nguyên tắc
- Không `any`/`@ts-ignore`. Component < 200 dòng, hook < 80, file < 300. 4 trạng thái cho UI có data.
- Mọi lib bên thứ ba wrap trong `lib/`. Feature không import trực tiếp `livekit-client`/firebase/socket.
- Mới thêm dep: `@livekit/track-processors` (đã được user duyệt) cho background blur.

---

## Phase 1 — Chuông báo chuyên nghiệp (FE)
- Sinh file âm thanh vào `public/sounds/`:
  - `call-incoming.wav`: chuông gọi đến, motif nhẹ nhàng, loop ~4s.
  - `call-outgoing.wav`: ringback gọi đi, cadence êm.
  - File được tạo bằng script Node tổng hợp PCM (committed). Không phụ thuộc asset ngoài.
- Wrapper mới `src/lib/sound/player.ts`: bọc `HTMLAudioElement` — `play(src,{loop})`, `stop()`. Có fallback WebAudio beep khi file lỗi/autoplay bị chặn.
- Viết lại `features/call/ringtone.ts`: `startRingtone(kind: 'incoming'|'outgoing')`, `stopRingtone()`.
- `CallContainer`: chọn ringtone theo `phase` (`outgoing`→outgoing, `incoming`→incoming).

## Phase 2 — Voice→Video mutual consent (FE + BE)
### BE
- Thêm gateway handlers (namespace `/call`):
  - `call:upgrade_request {callId}` → validate requester JOINED, call AUDIO + ONGOING → broadcast `call:upgrade_requested {callId, by}` cho participant còn lại.
  - `call:upgrade_accept {callId}` → set `call.type='VIDEO'` (lưu Mongo), broadcast `call:upgrade_accepted {callId, by}`.
  - `call:upgrade_decline {callId}` → broadcast `call:upgrade_declined {callId, by}`.
- Mutual consent **chỉ enforce cho 1-1**. Group call: mỗi người tự bật cam (không chặn), upgrade type về VIDEO khi có người bật.
### FE
- `call.store`: thêm `upgrade: { state: 'idle'|'requesting'|'incoming'; by?: string }` + actions `requestUpgrade/receiveUpgradeRequest/clearUpgrade`.
- `useCallActions`: emit `requestUpgrade/acceptUpgrade/declineUpgrade`.
- `useCallRealtime`: lắng nghe `call:upgrade_requested/accepted/declined` (validate Zod).
- `CallControls`: khi AUDIO 1-1 ONGOING, nút "chuyển video" → `requestUpgrade` → hiện "Đang chờ đồng ý…".
- Component mới `UpgradePrompt.tsx`: phía nhận thấy "X muốn chuyển sang video — Đồng ý / Từ chối".
- Khi `accepted`: cả 2 `promoteToVideo()` + `setCam(true)`. Khi `declined`: clear + toast.

## Phase 3 — Firebase incoming call push online+offline (FE + BE)
### BE
- `calls.service`: bỏ điều kiện chỉ-offline → **luôn** push `CALL_INCOMING` (transient, không lưu DB).
- Payload bổ sung: `callerName`, `callerAvatar`, `callId`, `callType`, `conversationId`.
- Khi call hủy/kết thúc → gửi data push `CALL_CANCELLED {callId}` để FE đóng notification.
### FE (`public/firebase-messaging-sw.js`)
- `CALL_INCOMING`: `showNotification` với actions `[accept, decline]`, `tag=callId`, `requireInteraction:true`, icon=avatar.
- `notificationclick`: focus client + `postMessage({type:'CALL_ACCEPT'|'CALL_DECLINE', callId})`; FE listener route vào store.
- `CALL_CANCELLED`: đóng notification theo `tag`.
- Foreground: app đang focus đã có `IncomingCallDialog` qua socket → **chặn toast trùng** với kind call.
- ⚠️ Giới hạn web: không thể ring full-screen như native khi trình duyệt đóng. Notification là cơ chế khả dụng nhất.

## Phase 4 — LiveKit pro (FE; chat ephemeral)
Mở rộng `lib/livekit/room.ts`:
- `setScreenShare(enabled)`.
- `getDevices()` / `switchDevice(kind, deviceId)` (mic/cam/loa).
- `setBackgroundBlur(enabled)` qua `@livekit/track-processors`.
- Expose event `connectionQuality`, `activeSpeakers`.
- `setRemoteMutedForMe(identity, muted)` (unsubscribe — mute cho riêng mình, không force-mute server).
- `sendChat(text)` / `onData(cb)` qua data channel (ephemeral, **không lưu lịch sử hội thoại**).

UI:
- `CallControls`: thêm nút screen share / blur / device / chat. Tách bớt nếu > 200 dòng.
- Component mới: `DevicePicker.tsx`, `CallChatPanel.tsx`.
- `CallStage`/`CallGrid`: hiển thị screen share nổi bật; viền active speaker; icon connection quality mỗi tile; menu mute-for-me.

---

## Quyết định đã chốt
- Mutual consent: chỉ 1-1.
- Mute: mute-cho-riêng-mình (client), không force-mute server.
- Chat trong call: không lưu DB.
- Recording: loại khỏi phạm vi.
- Dep mới: `@livekit/track-processors` (đã duyệt).

## Giới hạn / rủi ro
- Web push không thay thế được native CallKit (không ring full-screen khi trình duyệt đóng).
- Background blur tải model MediaPipe lần đầu (vài MB) → cần xử lý loading/lỗi.
- Đổi `call.type` giữa cuộc gọi phải đồng bộ FE/BE để lịch sử đúng.

## Thứ tự triển khai
P1 (chuông, FE độc lập) → P4 (LiveKit pro, FE độc lập) → P2 (consent, FE+BE) → P3 (push, FE+BE).
Mỗi phase một commit riêng. **Không auto-commit** (user tự commit).
