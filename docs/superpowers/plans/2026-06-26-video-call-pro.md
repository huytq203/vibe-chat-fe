# Video Call Pro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans để chạy task-by-task. Steps dùng checkbox (`- [ ]`).

**Goal:** Nâng tính năng call lên mức pro: chuông mới, voice→video 2-bên-đồng-ý, push Firebase online+offline, và bộ tính năng LiveKit (screen share, blur, device, quality, active speaker, mute-for-me, chat).

**Architecture:** Mở rộng feature `call` sẵn có (store/socket/livekit wrapper), không viết lại. BE thêm event upgrade + đổi logic push. FE thêm wrapper `lib/sound`, mở rộng `lib/livekit/room.ts`, sửa service worker.

**Tech Stack:** Next.js 16, React 19, TS strict, Zustand, livekit-client, `@livekit/track-processors` (mới), socket.io, firebase; BE NestJS + socket.io + livekit-server-sdk + firebase-admin + MongoDB.

## Global Constraints
- Không `any`/`@ts-ignore`/`eslint-disable` (trừ comment lý do). Component < 200 dòng, hook < 80, file < 300, function < 50.
- Mọi lib bên thứ ba wrap trong `lib/`. Feature không import trực tiếp livekit/firebase/socket.
- UI có data API xử lý đủ 4 trạng thái. Named export. `XxxProps` trên component.
- Query/key tập trung `services/`. Không tạo `features/<x>/api/`.
- Không auto-commit — user tự commit. Mỗi phase một commit.

---

## PHASE 1 — Chuông báo (FE, độc lập)

### Task 1.1: Sinh file âm thanh
**Files:** Create `public/sounds/call-incoming.wav`, `public/sounds/call-outgoing.wav`; Create script `scripts/gen-ringtones.mjs` (node, tổng hợp PCM WAV).
- `call-incoming.wav`: motif 3-4 nốt (vd C5-E5-G5) lặp, envelope mềm, ~4s loop, mono 44.1kHz.
- `call-outgoing.wav`: ringback 2-tone êm (vd 440+480Hz) 1s on / 2s off, ~4s loop.
- [ ] Viết `scripts/gen-ringtones.mjs` ghi WAV (header 44 byte + PCM 16-bit).
- [ ] Chạy `node scripts/gen-ringtones.mjs` → tạo 2 file trong `public/sounds/`.
- [ ] Mở thử file bằng trình phát để xác nhận có tiếng, loop êm.

### Task 1.2: Wrapper `lib/sound/player.ts`
**Files:** Create `src/lib/sound/player.ts`; Test `src/lib/sound/player.test.ts`.
**Produces:**
```ts
export function playLoop(src: string): void;   // tạo/replace HTMLAudioElement loop, autoplay; nuốt lỗi autoplay
export function stopSound(): void;             // pause + release element hiện tại
```
- [ ] Test: `playLoop` set `audio.loop=true` và gọi `play()`; `stopSound` gọi `pause()`. Mock `HTMLAudioElement` (jsdom) hoặc inject factory.
- [ ] Implement với 1 singleton element; `play()` trả Promise → `.catch` log debug (autoplay blocked), không throw.
- [ ] Test pass.

### Task 1.3: Viết lại `ringtone.ts` dùng wrapper + fallback
**Files:** Modify `src/features/call/ringtone.ts`; Test `src/features/call/ringtone.test.ts`.
**Produces:**
```ts
export function startRingtone(kind: 'incoming' | 'outgoing'): void;
export function stopRingtone(): void;
```
- [ ] Map kind→src (`/sounds/call-incoming.wav` | `/sounds/call-outgoing.wav`), gọi `playLoop`. Giữ WebAudio beep cũ làm fallback nếu element error.
- [ ] Test: `startRingtone('incoming')` gọi `playLoop` với src incoming.
- [ ] Test pass.

### Task 1.4: `CallContainer` chọn ringtone theo phase
**Files:** Modify `src/features/call/components/CallContainer.tsx:86-93`.
- [ ] Effect: `phase==='outgoing'` → `startRingtone('outgoing')`; `phase==='incoming'` → `startRingtone('incoming')`; else `stopRingtone()`.
- [ ] `npm run build` + `npm test` pass. Commit `feat(call): chuông báo file nhạc tách incoming/outgoing`.

---

## PHASE 4 — LiveKit pro (FE; làm trước P2/P3 vì không phụ thuộc BE)

### Task 4.1: Mở rộng wrapper `lib/livekit/room.ts`
**Files:** Modify `src/lib/livekit/room.ts`.
**Produces:**
```ts
export async function setScreenShare(enabled: boolean): Promise<void>;
export async function setBackgroundBlur(enabled: boolean): Promise<void>; // @livekit/track-processors
export async function listDevices(kind: MediaDeviceKind): Promise<MediaDeviceInfo[]>;
export async function switchDevice(kind: MediaDeviceKind, deviceId: string): Promise<void>;
export function setRemoteMutedForMe(identity: string, muted: boolean): void; // pub.setSubscribed
export function sendChat(text: string): void;     // localParticipant.publishData (topic 'chat')
// joinRoom handlers thêm: onActiveSpeakers?(ids), onConnectionQuality?(identity,q), onData?(from,text)
```
- [ ] Cài dep: `npm i @livekit/track-processors`.
- [ ] Thêm các hàm trên + đăng ký event `ActiveSpeakersChanged`, `ConnectionQualityChanged`, `DataReceived` trong `joinRoom`.
- [ ] Build pass (kiểm tra type từ livekit-client).

### Task 4.2: Store + hook cho pro state
**Files:** Modify `call.store.ts` (thêm `screenOn`, `blurOn`, `chatMessages: {from,text,at}[]`, `quality: Record<string,string>`, `activeSpeakers: string[]`, actions tương ứng); Modify `useLiveKitRoom.ts` (expose setScreenShare/setBlur/devices/sendChat, nối callback vào store); Modify `useCallActions.ts` nếu cần.
- [ ] Thêm state + actions (giữ store < 300 dòng, tách `call-pro.store.ts` nếu vượt).
- [ ] Build pass.

### Task 4.3: UI controls + panels
**Files:** Modify `CallControls.tsx` (nút screen/blur/device/chat); Create `src/features/call/components/DevicePicker.tsx`, `CallChatPanel.tsx`; Modify `CallStage.tsx`/`CallGrid.tsx` (screen share nổi bật, viền active speaker, icon quality, menu mute-for-me).
- [ ] Mỗi component < 200 dòng; tách nếu vượt. A11y: aria-label nút, điều hướng bàn phím.
- [ ] Build + lint pass. Commit `feat(call): LiveKit pro — screen share, blur, device, quality, active speaker, mute-for-me, chat`.

---

## PHASE 2 — Voice→Video mutual consent (FE + BE)

### Task 2.1 (BE): Gateway + service upgrade
**Files (BE repo `vibe-chat`):** Modify `src/modules/calls/calls.gateway.ts`, `calls.service.ts`, `call-broadcaster.service.ts`, `calls.repository.ts` (update type).
- [ ] Handler `call:upgrade_request {callId}`: validate sender JOINED + call ONGOING + AUDIO + 1-1 → broadcast `call:upgrade_requested {callId, by}` cho phía kia.
- [ ] Handler `call:upgrade_accept {callId}`: set `type='VIDEO'` (Mongo) → broadcast `call:upgrade_accepted {callId, by}`.
- [ ] Handler `call:upgrade_decline {callId}`: broadcast `call:upgrade_declined {callId, by}`.
- [ ] Build BE pass.

### Task 2.2 (FE): store + schemas + actions + realtime
**Files:** Modify `call.store.ts` (thêm `upgrade:{state,by?}` + actions `requestUpgrade/receiveUpgradeRequest/clearUpgrade`); `schemas.ts` (zod cho 3 event); `useCallActions.ts` (emit 3 event); `useCallRealtime.ts` (listen 3 event → store / promoteToVideo+setCam khi accepted).
- [ ] Thêm zod schema + types (`z.infer`). Không `any`.
- [ ] Build + test pass.

### Task 2.3 (FE): UI prompt
**Files:** Create `src/features/call/components/UpgradePrompt.tsx`; Modify `CallControls.tsx` (nút chuyển video khi AUDIO 1-1 → requestUpgrade, hiện "Đang chờ đồng ý…"); Modify `CallContainer.tsx` (render prompt khi `upgrade.state==='incoming'`).
- [ ] Đồng ý → `acceptUpgrade` + `promoteToVideo`+`setCam(true)`; từ chối → `declineUpgrade`+clear.
- [ ] Build pass. Commit (FE) + commit (BE) `feat(call): voice→video cần 2 bên đồng ý`.

---

## PHASE 3 — Firebase incoming push online+offline (FE + BE)

### Task 3.1 (BE): luôn push CALL_INCOMING + payload caller
**Files (BE):** Modify `src/modules/calls/calls.service.ts` (bỏ điều kiện offline ở push incoming; resolve callerName/avatar; thêm gửi `CALL_CANCELLED` khi hủy/end); `notifications.service.ts`/`fcm.service.ts` nếu cần truyền data fields.
- [ ] Push `CALL_INCOMING` luôn (transient), data: `{kind, callId, callType, conversationId, callerName, callerAvatar}`.
- [ ] Khi cancel/timeout/decline → push data `{kind:'CALL_CANCELLED', callId}`.
- [ ] Build BE pass.

### Task 3.2 (FE): service worker actions
**Files:** Modify `public/firebase-messaging-sw.js`.
- [ ] `CALL_INCOMING` → `showNotification(callerName, {body, icon:callerAvatar, tag:callId, requireInteraction:true, actions:[{action:'accept'},{action:'decline'}], data})`.
- [ ] `notificationclick`: accept/decline → `clients.openWindow`/focus + `postMessage({type:'CALL_ACCEPT'|'CALL_DECLINE', callId})`; đóng noti.
- [ ] `CALL_CANCELLED` → tìm notification theo tag, `.close()`.

### Task 3.3 (FE): nhận message từ SW + chặn toast trùng
**Files:** Modify/Create hook trong `features/notifications` hoặc `features/call` lắng nghe `navigator.serviceWorker` message → route store (accept/decline qua callId). Modify `useFcmSetup.ts`: với kind call khi foreground → bỏ qua toast (đã có IncomingCallDialog qua socket).
- [ ] Listener route `CALL_ACCEPT`/`CALL_DECLINE` vào call actions.
- [ ] Build pass. Commit (FE) + commit (BE) `feat(call): push cuộc gọi đến Firebase online+offline`.

---

## Self-Review
- Spec coverage: P1 chuông ✓, P2 consent ✓, P3 push ✓, P4 pro (screen/blur/device/quality/active speaker/mute/chat) ✓. Recording đã loại ✓.
- Type consistency: tên hàm wrapper (`setScreenShare/setBackgroundBlur/listDevices/switchDevice/setRemoteMutedForMe/sendChat`) dùng nhất quán FE. Event names `call:upgrade_request|accept|decline` (client→server) và `call:upgrade_requested|accepted|declined` (server→client) khớp FE/BE.
- Placeholder: các bước cần code thật sẽ viết khi implement đọc file thật (BE chưa đọc chi tiết → đọc trước khi sửa).
