# Audio / Video Call (1-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cuộc gọi audio/video 1-1 (báo hiệu qua socket `/call`, media qua LiveKit) với cửa sổ nổi kéo thả 3 trạng thái mini/normal/fullscreen.

**Architecture:** Hai kênh tách biệt — socket `/call` (wrap ở `lib/ws/call-socket.ts`) cho báo hiệu, và LiveKit (`lib/livekit/room.ts`) cho media với `livekitUrl/token` lấy từ ack. State UI ở Zustand `call.store.ts`; `Room` instance ở module singleton. UI nổi qua React Portal + `react-draggable`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript strict, socket.io-client (đã có), livekit-client (mới), react-draggable (mới), Zustand, TanStack Query, Vitest.

**Spec:** [docs/superpowers/specs/2026-06-06-audio-video-call-design.md](../specs/2026-06-06-audio-video-call-design.md)

---

## File structure

| File | Trách nhiệm |
|---|---|
| `src/config/env.ts` (modify) | + `NEXT_PUBLIC_CALL_WS_URL` |
| `.env` (modify) | + giá trị call WS |
| `src/lib/ws/call-socket.ts` (create) | Singleton socket namespace `/call` |
| `src/lib/livekit/room.ts` (create) | Wrap livekit-client: join/leave/mic/cam + callbacks |
| `src/features/call/types.ts` (create) | Kiểu domain |
| `src/features/call/schemas.ts` (create) | Zod parse ack + event |
| `src/features/call/utils.ts` (create) | `formatDuration`, `mapCallErrorCode` |
| `src/services/call.api.ts` (create) | REST GET history/detail |
| `src/services/keys.ts` (modify) | + `callKeys` |
| `src/features/call/stores/call.store.ts` (create) | Zustand state machine |
| `src/features/call/hooks/useLiveKitRoom.ts` (create) | Lifecycle Room + attach track |
| `src/features/call/hooks/useCallActions.ts` (create) | start/accept/decline/cancel/hangup/toggle |
| `src/features/call/hooks/useCallRealtime.ts` (create) | Nghe event BE→FE |
| `src/features/call/hooks/use-query.ts` (create) | `useCallHistory` |
| `src/lib/hooks/useDraggable` → dùng `react-draggable` | (không tự viết) |
| `src/features/call/components/CallContainer.tsx` (create) | Host Portal, switch theo phase |
| `src/features/call/components/IncomingCallDialog.tsx` (create) | Màn đổ chuông đến |
| `src/features/call/components/CallWindow.tsx` (create) | Khung nổi kéo thả + outgoing/ongoing |
| `src/features/call/components/CallStage.tsx` (create) | Render video/audio |
| `src/features/call/components/CallControls.tsx` (create) | Nút mic/cam/hangup/size |
| `src/features/call/components/CallButtons.tsx` (create) | 2 nút gọi cho ChatHeader |
| `src/features/call/index.ts` (create) | Export tường minh |
| `src/features/chat/components/layout/ChatLayout.tsx` (modify) | Mount realtime + CallContainer |
| `src/features/chat/components/layout/ChatHeader.tsx` (modify) | Nối CallButtons vào nút Phone/Video |

---

## Task 1: Cài deps + env

**Files:**
- Modify: `package.json` (qua npm), `src/config/env.ts`, `.env`

- [ ] **Step 1: Cài packages**

```bash
npm i livekit-client react-draggable
```
Expected: cả hai thêm vào `dependencies`, không lỗi peer.

- [ ] **Step 2: Thêm env vào schema** — `src/config/env.ts`, thêm dòng vào `z.object({...})` ngay sau `NEXT_PUBLIC_WS_URL`:

```ts
  NEXT_PUBLIC_WS_URL: z.string().url(),
  NEXT_PUBLIC_CALL_WS_URL: z.string().url(),
```

Và thêm vào object `safeParse({...})` ngay sau dòng `NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,`:

```ts
  NEXT_PUBLIC_CALL_WS_URL: process.env.NEXT_PUBLIC_CALL_WS_URL,
```

- [ ] **Step 3: Thêm giá trị `.env`** (thêm dòng dưới `NEXT_PUBLIC_WS_URL`):

```
NEXT_PUBLIC_CALL_WS_URL=http://localhost:3005/call
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (env.NEXT_PUBLIC_CALL_WS_URL có kiểu string).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/config/env.ts .env
git commit -m "feat(call): add livekit-client + react-draggable deps and call WS env"
```

---

## Task 2: Types + schemas + utils (có test)

**Files:**
- Create: `src/features/call/types.ts`, `src/features/call/schemas.ts`, `src/features/call/utils.ts`
- Test: `src/features/call/utils.test.ts`

- [ ] **Step 1: Viết `types.ts`**

```ts
export type CallType = 'AUDIO' | 'VIDEO';
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'ongoing';
export type WindowMode = 'mini' | 'normal' | 'fullscreen';
export type CallEndReason =
  | 'COMPLETED' | 'MISSED' | 'DECLINED' | 'CANCELLED' | 'TIMEOUT' | 'BUSY' | 'FAILED';

export type CallPeer = { id: string; name: string; avatarUrl: string | null };

export type CallParticipant = {
  userId: string;
  state: string;
  joinedAt: string | null;
  leftAt: string | null;
};

/** Ack của call:initiate / call:accept. */
export type CallTokenAck = {
  ok: true;
  callId: string;
  conversationId: string;
  type: CallType;
  status: string;
  participants: CallParticipant[];
  livekitUrl: string;
  livekitToken: string;
  room: string;
};

export type CallErrorAck = { ok: false; code: string; message: string };
export type CallOkAck = { ok: true };

export type IncomingPayload = {
  callId: string;
  conversationId: string;
  initiatorId: string;
  type: CallType;
  room: string;
};
export type AcceptedPayload = { callId: string; by: string };
export type DeclinedPayload = { callId: string; by: string; reason?: string };
export type CancelledPayload = { callId: string };
export type ParticipantPayload = { callId: string; userId: string };
export type EndedPayload = { callId: string; reason: CallEndReason; durationSec: number };
```

- [ ] **Step 2: Viết `schemas.ts`** (validate payload từ BE — §10/§13)

```ts
import { z } from 'zod';

export const callTypeSchema = z.enum(['AUDIO', 'VIDEO']);

export const callTokenAckSchema = z.object({
  ok: z.literal(true),
  callId: z.string(),
  conversationId: z.string(),
  type: callTypeSchema,
  status: z.string(),
  livekitUrl: z.string().url(),
  livekitToken: z.string(),
  room: z.string(),
  participants: z
    .array(
      z.object({
        userId: z.string(),
        state: z.string(),
        joinedAt: z.string().nullable(),
        leftAt: z.string().nullable(),
      }),
    )
    .default([]),
});

export const incomingSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  initiatorId: z.string(),
  type: callTypeSchema,
  room: z.string(),
});

export const endedSchema = z.object({
  callId: z.string(),
  reason: z.enum(['COMPLETED', 'MISSED', 'DECLINED', 'CANCELLED', 'TIMEOUT', 'BUSY', 'FAILED']),
  durationSec: z.number(),
});
```

- [ ] **Step 3: Viết test cho utils** — `src/features/call/utils.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatDuration, mapCallErrorCode } from './utils';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(5)).toBe('0:05');
  });
  it('formats minutes and seconds', () => {
    expect(formatDuration(323)).toBe('5:23');
  });
  it('formats over an hour', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

describe('mapCallErrorCode', () => {
  it('maps known busy code to Vietnamese', () => {
    expect(mapCallErrorCode('CALL_CALLEE_BUSY')).toBe('Máy bận');
  });
  it('falls back to provided message for unknown code', () => {
    expect(mapCallErrorCode('SOMETHING_ELSE', 'fallback')).toBe('fallback');
  });
});
```

- [ ] **Step 4: Run test (fail)**

Run: `npx vitest run src/features/call/utils.test.ts`
Expected: FAIL — module `./utils` not found.

- [ ] **Step 5: Viết `utils.ts`**

```ts
const ERROR_MESSAGES: Record<string, string> = {
  CALL_CALLEE_BUSY: 'Máy bận',
  CALL_ALREADY_ENDED: 'Cuộc gọi đã kết thúc',
  CALL_NOT_FOUND: 'Không tìm thấy cuộc gọi',
  CALL_NOT_PARTICIPANT: 'Bạn không thuộc cuộc gọi này',
  CONVERSATION_MEMBER_REQUIRED: 'Bạn không phải thành viên hội thoại',
  FORBIDDEN: 'Bạn không có quyền thực hiện',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập hết hạn',
};

export function mapCallErrorCode(code: string, fallback = 'Cuộc gọi thất bại'): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
```

- [ ] **Step 6: Run test (pass)**

Run: `npx vitest run src/features/call/utils.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/features/call/types.ts src/features/call/schemas.ts src/features/call/utils.ts src/features/call/utils.test.ts
git commit -m "feat(call): add domain types, zod schemas, utils with tests"
```

---

## Task 3: REST transport + query keys

**Files:**
- Create: `src/services/call.api.ts`
- Modify: `src/services/keys.ts`

- [ ] **Step 1: Thêm `callKeys`** — `src/services/keys.ts`, thêm sau block `chatKeys` (export riêng):

```ts
export const callKeys = {
  all: ['call'] as const,
  history: (conversationId?: string) =>
    [...callKeys.all, 'history', conversationId ?? 'all'] as const,
  detail: (callId: string) => [...callKeys.all, 'detail', callId] as const,
} as const;
```

- [ ] **Step 2: Viết `call.api.ts`**

```ts
import { apiClient } from '@/lib/api/client';
import type { CallParticipant, CallType, CallEndReason } from '@/features/call/types';

/** Bản ghi call từ REST (không có livekit token/url). */
export type CallRecord = {
  callId: string;
  conversationId: string;
  type: CallType;
  initiatorId: string;
  status: string;
  participants: CallParticipant[];
  endReason: CallEndReason | null;
  durationSec: number;
  answeredAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

/** Call REST transport. Pure — báo hiệu đi qua socket, không qua đây. */
export const callApi = {
  listHistory: (params: { conversationId?: string; page?: number; limit?: number }) =>
    apiClient.get<CallRecord[]>('/api/v1/calls/history', { query: params }),
  getCall: (callId: string) => apiClient.get<CallRecord>(`/api/v1/calls/${callId}`),
} as const;
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/call.api.ts src/services/keys.ts
git commit -m "feat(call): add REST transport and query keys"
```

---

## Task 4: Wrapper socket `/call`

**Files:**
- Create: `src/lib/ws/call-socket.ts`

> Mô phỏng `src/lib/ws/socket.ts` nhưng dùng `env.NEXT_PUBLIC_CALL_WS_URL`. Singleton riêng, KHÔNG dùng chung với socket `/chat`.

- [ ] **Step 1: Viết `call-socket.ts`**

```ts
import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Wrapper socket.io cho namespace /call (báo hiệu cuộc gọi).
 * Singleton riêng, tách hẳn socket /chat (lib/ws/socket.ts).
 */
const CALL_WS_URL = env.NEXT_PUBLIC_CALL_WS_URL;

let socket: Socket | null = null;
let tokenProvider: () => string | null = () => null;

export function setCallTokenProvider(fn: () => string | null): void {
  tokenProvider = fn;
}

export function getCallSocket(token: string | null): Socket | null {
  if (!token) {
    if (socket) {
      logger.info('Call WS close (no token)');
      socket.disconnect();
      socket = null;
    }
    return null;
  }
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  logger.info('Call WS connecting', { url: CALL_WS_URL });
  socket = io(CALL_WS_URL, {
    auth: (cb) => cb({ token: tokenProvider() ?? token }),
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });
  socket.on('connect', () => logger.info('Call WS connected', { id: socket?.id }));
  socket.on('disconnect', (reason) => {
    logger.info('Call WS disconnect', { reason });
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        if (socket && tokenProvider()) socket.connect();
      }, 2000);
    }
  });
  socket.on('connect_error', (err) => logger.warn('Call WS connect_error', { msg: err.message }));
  return socket;
}

export function refreshCallSocketAuth(newToken: string | null): void {
  if (!socket) return;
  if (!newToken) {
    socket.disconnect();
    socket = null;
    return;
  }
  socket.auth = { token: newToken };
  if (!socket.connected) socket.connect();
}

export function closeCallSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ws/call-socket.ts
git commit -m "feat(call): add /call namespace socket wrapper"
```

---

## Task 5: Wrapper LiveKit

**Files:**
- Create: `src/lib/livekit/room.ts`

> Ẩn `livekit-client`. Giữ `Room` singleton. Expose callback để hook đăng ký track. Feature KHÔNG import `livekit-client` trực tiếp (§7).

- [ ] **Step 1: Viết `room.ts`**

```ts
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type RemoteTrack,
  type LocalTrack,
} from 'livekit-client';
import { logger } from '@/lib/logger';

type TrackHandlers = {
  onRemoteTrack?: (track: RemoteTrack) => void;
  onRemoteTrackRemoved?: (track: RemoteTrack) => void;
  onLocalVideo?: (track: LocalTrack | null) => void;
  onDisconnected?: () => void;
};

let room: Room | null = null;

export function getRoom(): Room | null {
  return room;
}

export async function joinRoom(
  url: string,
  token: string,
  opts: { video: boolean },
  handlers: TrackHandlers,
): Promise<Room> {
  await leaveRoom();
  const r = new Room({ adaptiveStream: true, dynacast: true });
  room = r;

  r.on(RoomEvent.TrackSubscribed, (track) => handlers.onRemoteTrack?.(track));
  r.on(RoomEvent.TrackUnsubscribed, (track) => handlers.onRemoteTrackRemoved?.(track));
  r.on(RoomEvent.Disconnected, () => {
    handlers.onDisconnected?.();
  });

  await r.connect(url, token);

  const tracks = await createLocalTracks({ audio: true, video: opts.video });
  for (const t of tracks) await r.localParticipant.publishTrack(t);
  const cam = tracks.find((t) => t.kind === Track.Kind.Video) ?? null;
  handlers.onLocalVideo?.(cam);

  logger.info('LiveKit joined', { room: r.name });
  return r;
}

export async function leaveRoom(): Promise<void> {
  if (!room) return;
  try {
    await room.disconnect();
  } catch (err) {
    logger.warn('LiveKit disconnect error', { err: String(err) });
  }
  room = null;
}

export async function setMic(enabled: boolean): Promise<void> {
  await room?.localParticipant.setMicrophoneEnabled(enabled);
}

export async function setCam(enabled: boolean): Promise<void> {
  await room?.localParticipant.setCameraEnabled(enabled);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (nếu lỗi import type từ livekit-client, kiểm tra tên export trong `node_modules/livekit-client`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/livekit/room.ts
git commit -m "feat(call): add livekit-client room wrapper"
```

---

## Task 6: Zustand store + test state machine

**Files:**
- Create: `src/features/call/stores/call.store.ts`
- Test: `src/features/call/stores/call.store.test.ts`

- [ ] **Step 1: Viết test** — `call.store.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useCallStore } from './call.store';
import type { CallPeer } from '@/features/call/types';

const peer: CallPeer = { id: 'u2', name: 'Bob', avatarUrl: null };

describe('call.store state machine', () => {
  beforeEach(() => useCallStore.getState().reset());

  it('starts idle', () => {
    expect(useCallStore.getState().phase).toBe('idle');
  });

  it('startOutgoing → outgoing with call data', () => {
    useCallStore.getState().startOutgoing('c1', 'VIDEO', peer);
    const s = useCallStore.getState();
    expect(s.phase).toBe('outgoing');
    expect(s.call?.conversationId).toBe('c1');
    expect(s.call?.type).toBe('VIDEO');
  });

  it('receiveIncoming → incoming', () => {
    useCallStore.getState().receiveIncoming('call1', 'c1', 'AUDIO', peer);
    expect(useCallStore.getState().phase).toBe('incoming');
    expect(useCallStore.getState().call?.callId).toBe('call1');
  });

  it('markOngoing sets startedAt', () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer);
    useCallStore.getState().markOngoing('call1', 1000);
    const s = useCallStore.getState();
    expect(s.phase).toBe('ongoing');
    expect(s.startedAt).toBe(1000);
    expect(s.call?.callId).toBe('call1');
  });

  it('reset returns to idle', () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer);
    useCallStore.getState().reset();
    expect(useCallStore.getState().phase).toBe('idle');
    expect(useCallStore.getState().call).toBeNull();
  });

  it('setWindowMode and setPosition update window', () => {
    useCallStore.getState().setWindowMode('mini');
    useCallStore.getState().setPosition(10, 20);
    expect(useCallStore.getState().window).toEqual({ mode: 'mini', x: 10, y: 20 });
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npx vitest run src/features/call/stores/call.store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Viết `call.store.ts`**

```ts
import { create } from 'zustand';
import type { CallParticipant, CallPeer, CallPhase, CallType, WindowMode } from '@/features/call/types';

type CallData = { callId: string | null; conversationId: string; type: CallType; peer: CallPeer };
type CallWindow = { mode: WindowMode; x: number; y: number };

type CallState = {
  phase: CallPhase;
  call: CallData | null;
  participants: CallParticipant[];
  micOn: boolean;
  camOn: boolean;
  startedAt: number | null;
  window: CallWindow;
  startOutgoing: (conversationId: string, type: CallType, peer: CallPeer) => void;
  receiveIncoming: (callId: string, conversationId: string, type: CallType, peer: CallPeer) => void;
  markOngoing: (callId: string, startedAt: number) => void;
  setMic: (on: boolean) => void;
  setCam: (on: boolean) => void;
  setWindowMode: (mode: WindowMode) => void;
  setPosition: (x: number, y: number) => void;
  reset: () => void;
};

const INITIAL_WINDOW: CallWindow = { mode: 'normal', x: 0, y: 0 };

export const useCallStore = create<CallState>((set) => ({
  phase: 'idle',
  call: null,
  participants: [],
  micOn: true,
  camOn: true,
  startedAt: null,
  window: INITIAL_WINDOW,
  startOutgoing: (conversationId, type, peer) =>
    set({
      phase: 'outgoing',
      call: { callId: null, conversationId, type, peer },
      micOn: true,
      camOn: type === 'VIDEO',
      startedAt: null,
      window: INITIAL_WINDOW,
    }),
  receiveIncoming: (callId, conversationId, type, peer) =>
    set({
      phase: 'incoming',
      call: { callId, conversationId, type, peer },
      micOn: true,
      camOn: type === 'VIDEO',
      startedAt: null,
      window: INITIAL_WINDOW,
    }),
  markOngoing: (callId, startedAt) =>
    set((s) => ({
      phase: 'ongoing',
      startedAt,
      call: s.call ? { ...s.call, callId } : s.call,
    })),
  setMic: (on) => set({ micOn: on }),
  setCam: (on) => set({ camOn: on }),
  setWindowMode: (mode) => set((s) => ({ window: { ...s.window, mode } })),
  setPosition: (x, y) => set((s) => ({ window: { ...s.window, x, y } })),
  reset: () =>
    set({ phase: 'idle', call: null, participants: [], startedAt: null, window: INITIAL_WINDOW }),
}));
```

- [ ] **Step 4: Run test (pass)**

Run: `npx vitest run src/features/call/stores/call.store.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/call/stores/call.store.ts src/features/call/stores/call.store.test.ts
git commit -m "feat(call): add call store with state machine tests"
```

---

## Task 7: Hook useLiveKitRoom

**Files:**
- Create: `src/features/call/hooks/useLiveKitRoom.ts`

> Quản lý attach/detach track vào DOM. Trả ref cho remote container + local video element, và hàm join/leave.

- [ ] **Step 1: Viết `useLiveKitRoom.ts`**

```ts
'use client';

import { useCallback, useRef } from 'react';
import { Track, type LocalTrack, type RemoteTrack } from 'livekit-client';
import { joinRoom, leaveRoom, setCam, setMic } from '@/lib/livekit/room';
import type { CallType } from '@/features/call/types';

/** Quản lý vòng đời LiveKit Room + gắn track vào DOM element. */
export function useLiveKitRoom() {
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);

  const attachRemote = useCallback((track: RemoteTrack) => {
    const el = track.attach();
    if (track.kind === Track.Kind.Video) {
      el.classList.add('h-full', 'w-full', 'object-cover');
      remoteRef.current?.replaceChildren(el);
    }
    // audio: attach() tự phát, không cần append vào DOM hiển thị.
  }, []);

  const attachLocal = useCallback((track: LocalTrack | null) => {
    if (!track || !localRef.current) return;
    const el = track.attach();
    el.classList.add('h-full', 'w-full', 'object-cover');
    localRef.current.replaceChildren(el);
  }, []);

  const join = useCallback(
    async (url: string, token: string, type: CallType, onDisconnected: () => void) => {
      await joinRoom(
        url,
        token,
        { video: type === 'VIDEO' },
        {
          onRemoteTrack: attachRemote,
          onLocalVideo: attachLocal,
          onDisconnected,
        },
      );
    },
    [attachRemote, attachLocal],
  );

  const leave = useCallback(async () => {
    remoteRef.current?.replaceChildren();
    localRef.current?.replaceChildren();
    await leaveRoom();
  }, []);

  return { remoteRef, localRef, join, leave, setMic, setCam };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/call/hooks/useLiveKitRoom.ts
git commit -m "feat(call): add useLiveKitRoom hook"
```

---

## Task 8: Hook useCallActions

**Files:**
- Create: `src/features/call/hooks/useCallActions.ts`

> Hành động FE→BE: emit qua call-socket (có ack), drive LiveKit + store. Dùng `useLiveKitRoom` ở component cấp cao và truyền vào — nhưng để gọn, actions tự gọi `lib/livekit/room` trực tiếp cho mic/cam/leave, còn join để component (cần ref DOM) thực hiện. Vì vậy action `start`/`accept` trả ack token, component sẽ join.

- [ ] **Step 1: Viết `useCallActions.ts`**

```ts
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { getCallSocket } from '@/lib/ws/call-socket';
import { leaveRoom, setCam, setMic } from '@/lib/livekit/room';
import { useCallStore } from '@/features/call/stores/call.store';
import { callTokenAckSchema } from '@/features/call/schemas';
import { mapCallErrorCode } from '@/features/call/utils';
import type { CallPeer, CallType, CallTokenAck } from '@/features/call/types';

type Ack = { ok: boolean; code?: string; message?: string } & Record<string, unknown>;

function emitWithAck(event: string, payload: unknown): Promise<Ack> {
  return new Promise((resolve) => {
    const socket = getCallSocket(apiAuth.getToken());
    if (!socket) return resolve({ ok: false, code: 'NO_SOCKET', message: 'Mất kết nối' });
    socket.emit(event, payload, (ack: Ack) => resolve(ack ?? { ok: false }));
  });
}

export function useCallActions() {
  const store = useCallStore;

  const startCall = useCallback(
    async (conversationId: string, type: CallType, peer: CallPeer): Promise<CallTokenAck | null> => {
      store.getState().startOutgoing(conversationId, type, peer);
      const ack = await emitWithAck('call:initiate', { conversationId, type });
      if (!ack.ok) {
        toast.error(mapCallErrorCode(ack.code ?? '', ack.message));
        store.getState().reset();
        return null;
      }
      const parsed = callTokenAckSchema.safeParse(ack);
      if (!parsed.success) {
        toast.error('Phản hồi cuộc gọi không hợp lệ');
        store.getState().reset();
        return null;
      }
      return parsed.data;
    },
    [store],
  );

  const acceptCall = useCallback(
    async (callId: string): Promise<CallTokenAck | null> => {
      const ack = await emitWithAck('call:accept', { callId });
      if (!ack.ok) {
        toast.error(mapCallErrorCode(ack.code ?? '', ack.message));
        store.getState().reset();
        return null;
      }
      const parsed = callTokenAckSchema.safeParse(ack);
      if (!parsed.success) {
        store.getState().reset();
        return null;
      }
      return parsed.data;
    },
    [store],
  );

  const declineCall = useCallback(
    async (callId: string, reason?: string) => {
      await emitWithAck('call:decline', { callId, reason });
      store.getState().reset();
    },
    [store],
  );

  const cancelCall = useCallback(
    async (callId: string) => {
      await emitWithAck('call:cancel', { callId });
      await leaveRoom();
      store.getState().reset();
    },
    [store],
  );

  const hangup = useCallback(
    async (callId: string) => {
      await leaveRoom();
      await emitWithAck('call:leave', { callId });
      store.getState().reset();
    },
    [store],
  );

  const toggleMic = useCallback(async () => {
    const next = !store.getState().micOn;
    await setMic(next);
    store.getState().setMic(next);
  }, [store]);

  const toggleCam = useCallback(async () => {
    const next = !store.getState().camOn;
    await setCam(next);
    store.getState().setCam(next);
  }, [store]);

  return { startCall, acceptCall, declineCall, cancelCall, hangup, toggleMic, toggleCam };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/call/hooks/useCallActions.ts
git commit -m "feat(call): add useCallActions (emit + livekit + store)"
```

---

## Task 9: Hook useCallRealtime

**Files:**
- Create: `src/features/call/hooks/useCallRealtime.ts`

> Mount 1 lần ở root. Khởi tạo call-socket, set token provider, nghe event BE→FE. Việc join LiveKit khi nhận `call:incoming` KHÔNG xảy ra (chỉ join khi accept). Khi nhận `call:ended` → leaveRoom + reset.

- [ ] **Step 1: Viết `useCallRealtime.ts`**

```ts
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { leaveRoom } from '@/lib/livekit/room';
import {
  closeCallSocket,
  getCallSocket,
  refreshCallSocketAuth,
  setCallTokenProvider,
} from '@/lib/ws/call-socket';
import { useAuthStore } from '@/features/auth';
import { useCallStore } from '@/features/call/stores/call.store';
import { incomingSchema, endedSchema } from '@/features/call/schemas';
import type { AcceptedPayload, CancelledPayload, DeclinedPayload, EndedPayload, IncomingPayload } from '@/features/call/types';

export function useCallRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    setCallTokenProvider(() => apiAuth.getToken());
    apiAuth.onTokenChange((t) => refreshCallSocketAuth(t));
    return () => apiAuth.onTokenChange(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onUnload() {
      void leaveRoom();
      closeCallSocket();
    }
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      closeCallSocket();
      return;
    }
    const socket = getCallSocket(apiAuth.getToken());
    if (!socket) return;
    const s = useCallStore;

    function onIncoming(raw: IncomingPayload) {
      const p = incomingSchema.safeParse(raw);
      if (!p.success) return;
      // Bỏ qua nếu đang trong cuộc gọi khác.
      if (s.getState().phase !== 'idle') return;
      s.getState().receiveIncoming(p.data.callId, p.data.conversationId, p.data.type, {
        id: p.data.initiatorId,
        name: 'Cuộc gọi đến',
        avatarUrl: null,
      });
    }
    function onAccepted(_payload: AcceptedPayload) {
      // Caller: callee đã bắt máy. markOngoing được component caller xử lý sau khi join LiveKit.
      // Ở đây chỉ cần đảm bảo timer chạy nếu chưa.
      const st = s.getState();
      if (st.phase === 'outgoing' && st.call) {
        s.getState().markOngoing(st.call.callId ?? '', Date.now());
      }
    }
    function onDeclined(_payload: DeclinedPayload) {
      if (s.getState().phase === 'outgoing') {
        toast('Cuộc gọi bị từ chối');
        void leaveRoom();
        s.getState().reset();
      }
    }
    function onCancelled(_payload: CancelledPayload) {
      if (s.getState().phase === 'incoming') s.getState().reset();
    }
    function onEnded(raw: EndedPayload) {
      const p = endedSchema.safeParse(raw);
      void leaveRoom();
      s.getState().reset();
      if (p.success && p.data.reason === 'MISSED') toast('Cuộc gọi nhỡ');
    }

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:declined', onDeclined);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:ended', onEnded);
    };
  }, [isAuthed]);
}
```

> Lưu ý: `markOngoing` ở `onAccepted` dùng `Date.now()` cho timer. `Date.now()` chạy trong browser runtime (không phải workflow script) nên hợp lệ.

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/call/hooks/useCallRealtime.ts
git commit -m "feat(call): add useCallRealtime listener"
```

---

## Task 10: use-query (lịch sử call) — optional nhưng giữ đúng pattern

**Files:**
- Create: `src/features/call/hooks/use-query.ts`

- [ ] **Step 1: Viết `use-query.ts`**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/services/call.api';
import { callKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

export function useCallHistory(conversationId?: string) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: callKeys.history(conversationId),
    queryFn: () => callApi.listHistory({ conversationId, page: 1, limit: 20 }),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: Verify typecheck + commit**

Run: `npx tsc --noEmit`
```bash
git add src/features/call/hooks/use-query.ts
git commit -m "feat(call): add useCallHistory query hook"
```

---

## Task 11: CallControls + test

**Files:**
- Create: `src/features/call/components/CallControls.tsx`
- Test: `src/features/call/components/CallControls.test.tsx`

- [ ] **Step 1: Viết test** — `CallControls.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallControls } from './CallControls';

describe('CallControls', () => {
  it('calls onToggleMic when mic button clicked', async () => {
    const onToggleMic = vi.fn();
    render(
      <CallControls
        type="VIDEO" micOn camOn mode="normal"
        onToggleMic={onToggleMic} onToggleCam={vi.fn()} onHangup={vi.fn()} onCycleMode={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText('Tắt micro'));
    expect(onToggleMic).toHaveBeenCalledOnce();
  });

  it('calls onHangup when hangup clicked', async () => {
    const onHangup = vi.fn();
    render(
      <CallControls
        type="AUDIO" micOn camOn={false} mode="normal"
        onToggleMic={vi.fn()} onToggleCam={vi.fn()} onHangup={onHangup} onCycleMode={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText('Kết thúc'));
    expect(onHangup).toHaveBeenCalledOnce();
  });

  it('hides camera button for AUDIO calls', () => {
    render(
      <CallControls
        type="AUDIO" micOn camOn={false} mode="normal"
        onToggleMic={vi.fn()} onToggleCam={vi.fn()} onHangup={vi.fn()} onCycleMode={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Tắt camera')).toBeNull();
    expect(screen.queryByLabelText('Bật camera')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npx vitest run src/features/call/components/CallControls.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Viết `CallControls.tsx`**

```tsx
'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import type { CallType, WindowMode } from '@/features/call/types';

type CallControlsProps = {
  type: CallType;
  micOn: boolean;
  camOn: boolean;
  mode: WindowMode;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
  onCycleMode: () => void;
};

export function CallControls({
  type, micOn, camOn, onToggleMic, onToggleCam, onHangup, onCycleMode,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 p-4">
      <Button
        variant="ghost" size="icon"
        aria-label={micOn ? 'Tắt micro' : 'Bật micro'}
        onClick={onToggleMic}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-destructive" />}
      </Button>

      {type === 'VIDEO' && (
        <Button
          variant="ghost" size="icon"
          aria-label={camOn ? 'Tắt camera' : 'Bật camera'}
          onClick={onToggleCam}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-destructive" />}
        </Button>
      )}

      <Button variant="ghost" size="icon" aria-label="Đổi kích thước" onClick={onCycleMode}>
        <Maximize2 className="h-5 w-5" />
      </Button>

      <Button variant="solid" size="icon" aria-label="Kết thúc" onClick={onHangup} className="bg-destructive text-white hover:bg-destructive/90">
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
```

> Nếu `size="icon"` không tồn tại trong Button variants, dùng `size="icon-sm"` (đã thấy trong ChatHeader). Kiểm tra `src/components/ui/button/Button.tsx` trước khi chọn.

- [ ] **Step 4: Run test (pass)**

Run: `npx vitest run src/features/call/components/CallControls.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/call/components/CallControls.tsx src/features/call/components/CallControls.test.tsx
git commit -m "feat(call): add CallControls with tests"
```

---

## Task 12: CallStage

**Files:**
- Create: `src/features/call/components/CallStage.tsx`

- [ ] **Step 1: Viết `CallStage.tsx`**

```tsx
'use client';

import { forwardRef } from 'react';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallPeer, CallType } from '@/features/call/types';

type CallStageProps = {
  type: CallType;
  peer: CallPeer;
  remoteRef: React.RefObject<HTMLDivElement | null>;
  localRef: React.RefObject<HTMLDivElement | null>;
  statusText: string;
};

/** Vùng hiển thị media. Video: remote full + local PiP. Audio: avatar + status. */
export const CallStage = forwardRef<HTMLDivElement, CallStageProps>(function CallStage(
  { type, peer, remoteRef, localRef, statusText },
) {
  if (type === 'AUDIO') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-sidebar">
        <Avatar name={peer.name} src={peer.avatarUrl} size="lg" />
        <div className="text-center">
          <p className="text-base font-medium text-foreground">{peer.name}</p>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      <div ref={remoteRef} className="absolute inset-0 flex items-center justify-center" />
      <div className="pointer-events-none absolute right-3 top-3 z-10 text-xs text-white/80">
        {statusText}
      </div>
      <div
        ref={localRef}
        className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-lg border border-white/20 bg-black/40"
      />
    </div>
  );
});
```

> `forwardRef` không dùng tham số ref nội bộ ở đây (ref qua props remoteRef/localRef). Có thể đổi sang function component thường nếu lint cảnh báo ref không dùng. Nếu vậy bỏ `forwardRef` và khai báo `export function CallStage(props: CallStageProps)`.

- [ ] **Step 2: Verify typecheck + commit**

Run: `npx tsc --noEmit`
```bash
git add src/features/call/components/CallStage.tsx
git commit -m "feat(call): add CallStage media area"
```

---

## Task 13: CallWindow (drag + 3 trạng thái) + test

**Files:**
- Create: `src/features/call/components/CallWindow.tsx`
- Test: `src/features/call/components/CallWindow.test.tsx`

> Khung nổi cho phase `outgoing` và `ongoing`. Drag bằng `react-draggable` (nodeRef). Mode quyết định class kích thước. Nhận sẵn refs + handlers từ CallContainer.

- [ ] **Step 1: Viết test** — `CallWindow.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallWindow } from './CallWindow';
import type { CallPeer } from '@/features/call/types';

const peer: CallPeer = { id: 'u2', name: 'Bob', avatarUrl: null };
const baseProps = {
  type: 'AUDIO' as const,
  peer,
  phase: 'ongoing' as const,
  mode: 'normal' as const,
  micOn: true,
  camOn: false,
  position: { x: 0, y: 0 },
  statusText: '0:05',
  remoteRef: { current: null },
  localRef: { current: null },
  onToggleMic: vi.fn(),
  onToggleCam: vi.fn(),
  onHangup: vi.fn(),
  onCycleMode: vi.fn(),
  onDrag: vi.fn(),
};

describe('CallWindow', () => {
  it('renders peer name in normal mode', () => {
    render(<CallWindow {...baseProps} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders hangup control', () => {
    render(<CallWindow {...baseProps} />);
    expect(screen.getByLabelText('Kết thúc')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test (fail)**

Run: `npx vitest run src/features/call/components/CallWindow.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Viết `CallWindow.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import Draggable, { type DraggableData } from 'react-draggable';
import { cn } from '@/lib/utils/cn';
import type { CallPeer, CallPhase, CallType, WindowMode } from '@/features/call/types';
import { CallStage } from './CallStage';
import { CallControls } from './CallControls';

type CallWindowProps = {
  type: CallType;
  peer: CallPeer;
  phase: CallPhase;
  mode: WindowMode;
  micOn: boolean;
  camOn: boolean;
  position: { x: number; y: number };
  statusText: string;
  remoteRef: React.RefObject<HTMLDivElement | null>;
  localRef: React.RefObject<HTMLDivElement | null>;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
  onCycleMode: () => void;
  onDrag: (x: number, y: number) => void;
};

const SIZE_CLASS: Record<WindowMode, string> = {
  mini: 'h-[120px] w-[200px]',
  normal: 'h-[520px] w-[360px]',
  fullscreen: 'inset-0 h-screen w-screen rounded-none',
};

export function CallWindow(props: CallWindowProps) {
  const { mode, peer, type, micOn, camOn, statusText, remoteRef, localRef, position } = props;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const draggable = mode !== 'fullscreen';

  const card = (
    <div
      ref={nodeRef}
      className={cn(
        'pointer-events-auto fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
        mode === 'fullscreen' ? SIZE_CLASS.fullscreen : `bottom-6 right-6 ${SIZE_CLASS[mode]}`,
      )}
    >
      {/* Handle kéo (ẩn ở fullscreen) */}
      {draggable && (
        <div className="call-drag-handle flex cursor-move items-center justify-between px-3 py-2 text-xs text-muted-foreground">
          <span className="truncate">{peer.name}</span>
          <span>{statusText}</span>
        </div>
      )}

      {mode === 'mini' ? (
        <button
          type="button"
          aria-label="Kết thúc"
          onClick={props.onHangup}
          className="flex flex-1 items-center justify-center bg-destructive/10 text-sm text-destructive"
        >
          {peer.name} · {statusText} · Tắt
        </button>
      ) : (
        <>
          <CallStage type={type} peer={peer} remoteRef={remoteRef} localRef={localRef} statusText={statusText} />
          <CallControls
            type={type} micOn={micOn} camOn={camOn} mode={mode}
            onToggleMic={props.onToggleMic} onToggleCam={props.onToggleCam}
            onHangup={props.onHangup} onCycleMode={props.onCycleMode}
          />
        </>
      )}
    </div>
  );

  if (!draggable) return card;

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      handle=".call-drag-handle"
      position={position}
      onStop={(_e, data: DraggableData) => props.onDrag(data.x, data.y)}
      bounds="body"
    >
      {card}
    </Draggable>
  );
}
```

> Mini mode hiển thị nút "Tắt" gộp; vì test chỉ kiểm tra `normal`. Nếu `react-draggable` báo lỗi type với `nodeRef`, ép kiểu như trên (`as React.RefObject<HTMLElement>`).

- [ ] **Step 4: Run test (pass)**

Run: `npx vitest run src/features/call/components/CallWindow.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/call/components/CallWindow.tsx src/features/call/components/CallWindow.test.tsx
git commit -m "feat(call): add draggable CallWindow with size states"
```

---

## Task 14: IncomingCallDialog

**Files:**
- Create: `src/features/call/components/IncomingCallDialog.tsx`

- [ ] **Step 1: Viết `IncomingCallDialog.tsx`**

```tsx
'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallPeer, CallType } from '@/features/call/types';

type IncomingCallDialogProps = {
  peer: CallPeer;
  type: CallType;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallDialog({ peer, type, onAccept, onDecline }: IncomingCallDialogProps) {
  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-[60] w-[320px] rounded-2xl border border-border bg-card p-5 shadow-2xl">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={peer.name} src={peer.avatarUrl} size="lg" />
        <div className="text-center">
          <p className="text-base font-medium text-foreground">{peer.name}</p>
          <p className="text-sm text-muted-foreground">
            {type === 'VIDEO' ? 'Cuộc gọi video đến…' : 'Cuộc gọi thoại đến…'}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-6">
          <Button
            variant="solid" size="icon" aria-label="Từ chối" onClick={onDecline}
            className="h-12 w-12 rounded-full bg-destructive text-white hover:bg-destructive/90"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            variant="solid" size="icon" aria-label="Bắt máy" onClick={onAccept}
            className="h-12 w-12 rounded-full bg-success text-white hover:bg-success/90"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

Run: `npx tsc --noEmit`
```bash
git add src/features/call/components/IncomingCallDialog.tsx
git commit -m "feat(call): add IncomingCallDialog"
```

---

## Task 15: CallContainer (orchestrator + Portal)

**Files:**
- Create: `src/features/call/components/CallContainer.tsx`

> Host Portal, đọc store, ghép `useLiveKitRoom` + `useCallActions`, switch render theo `phase`. Quản lý timer hiển thị + ring timeout 45s. Khi caller `startCall` thành công, join LiveKit ở đây.

- [ ] **Step 1: Viết `CallContainer.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallActions } from '@/features/call/hooks/useCallActions';
import { useLiveKitRoom } from '@/features/call/hooks/useLiveKitRoom';
import { formatDuration } from '@/features/call/utils';
import { CallWindow } from './CallWindow';
import { IncomingCallDialog } from './IncomingCallDialog';
import type { WindowMode } from '@/features/call/types';

const MODE_ORDER: WindowMode[] = ['normal', 'mini', 'fullscreen'];
const RING_TIMEOUT_MS = 45_000;

export function CallContainer() {
  const phase = useCallStore((s) => s.phase);
  const call = useCallStore((s) => s.call);
  const mode = useCallStore((s) => s.window.mode);
  const position = useCallStore((s) => s.window);
  const micOn = useCallStore((s) => s.micOn);
  const camOn = useCallStore((s) => s.camOn);
  const startedAt = useCallStore((s) => s.startedAt);

  const actions = useCallActions();
  const { remoteRef, localRef, join, leave } = useLiveKitRoom();
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Timer hiển thị khi ongoing.
  useEffect(() => {
    if (phase !== 'ongoing' || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  // Ring timeout cho caller.
  useEffect(() => {
    if (phase === 'outgoing') {
      ringTimer.current = setTimeout(() => {
        void leave();
        useCallStore.getState().reset();
      }, RING_TIMEOUT_MS);
    }
    return () => {
      if (ringTimer.current) clearTimeout(ringTimer.current);
    };
  }, [phase, leave]);

  if (!mounted || phase === 'idle' || !call) return null;

  const onDisconnected = () => {
    useCallStore.getState().reset();
  };

  const handleAccept = async () => {
    if (!call.callId) return;
    const ack = await actions.acceptCall(call.callId);
    if (!ack) return;
    useCallStore.getState().markOngoing(ack.callId, Date.now());
    await join(ack.livekitUrl, ack.livekitToken, ack.type, onDisconnected);
  };

  const handleDecline = () => call.callId && actions.declineCall(call.callId);
  const handleHangup = async () => {
    if (call.callId) await actions.hangup(call.callId);
    else {
      await leave();
      useCallStore.getState().reset();
    }
  };
  const handleCycleMode = () => {
    const idx = MODE_ORDER.indexOf(mode);
    useCallStore.getState().setWindowMode(MODE_ORDER[(idx + 1) % MODE_ORDER.length]);
  };

  const statusText =
    phase === 'outgoing' ? 'Đang gọi…' : phase === 'ongoing' ? formatDuration(elapsed) : '';

  let content: React.ReactNode = null;
  if (phase === 'incoming') {
    content = (
      <IncomingCallDialog peer={call.peer} type={call.type} onAccept={handleAccept} onDecline={handleDecline} />
    );
  } else {
    content = (
      <CallWindow
        type={call.type} peer={call.peer} phase={phase} mode={mode}
        micOn={micOn} camOn={camOn} position={{ x: position.x, y: position.y }}
        statusText={statusText} remoteRef={remoteRef} localRef={localRef}
        onToggleMic={actions.toggleMic} onToggleCam={actions.toggleCam}
        onHangup={handleHangup} onCycleMode={handleCycleMode}
        onDrag={(x, y) => useCallStore.getState().setPosition(x, y)}
      />
    );
  }

  return createPortal(content, document.body);
}
```

> **Caller join LiveKit:** việc join cho caller được kích từ `CallButtons.startCall` flow (Task 16) — sau khi `startCall` trả ack, gọi `join(...)`. Để tránh truyền `join` ra ngoài, ta để caller-join trong CallContainer bằng cách lắng nghe `phase==='outgoing'` + ack lưu tạm. **Đơn giản hoá:** CallButtons gọi `actions.startCall` rồi tự không join; thay vào đó CallContainer theo dõi `outgoing` và join bằng token. Vì token chỉ có trong ack (không vào store), ta lưu token caller vào một ref module trong `useCallActions` hoặc trả ack cho CallButtons để CallButtons gọi `window`-level. **Quyết định:** Xem Task 16 — CallButtons sẽ nhận ack và gọi một hàm join expose từ CallContainer qua store callback. Để giữ plan đơn giản và đúng, dùng cách: lưu pending token trong store (chấp nhận token tạm trong state, xoá ngay sau join).

- [ ] **Step 2: Bổ sung store cho pending caller token** — sửa `call.store.ts`:

Thêm field + action (thêm vào `CallState`):
```ts
  pendingJoin: { url: string; token: string; type: CallType } | null;
  setPendingJoin: (p: { url: string; token: string; type: CallType } | null) => void;
```
Khởi tạo `pendingJoin: null,` và action:
```ts
  setPendingJoin: (p) => set({ pendingJoin: p }),
```
Và trong `reset` thêm `pendingJoin: null`.

- [ ] **Step 3: CallContainer join khi có pendingJoin** — thêm effect vào CallContainer:

```tsx
  const pendingJoin = useCallStore((s) => s.pendingJoin);
  useEffect(() => {
    if (!pendingJoin) return;
    const p = pendingJoin;
    useCallStore.getState().setPendingJoin(null);
    void join(p.url, p.token, p.type, onDisconnected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJoin]);
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/call/components/CallContainer.tsx src/features/call/stores/call.store.ts
git commit -m "feat(call): add CallContainer orchestrator with portal + timers"
```

---

## Task 16: CallButtons + wire ChatHeader

**Files:**
- Create: `src/features/call/components/CallButtons.tsx`
- Modify: `src/features/chat/components/layout/ChatHeader.tsx`

- [ ] **Step 1: Viết `CallButtons.tsx`**

```tsx
'use client';

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCallActions } from '@/features/call/hooks/useCallActions';
import { useCallStore } from '@/features/call/stores/call.store';
import type { CallPeer, CallType } from '@/features/call/types';

type CallButtonsProps = { conversationId: string; peer: CallPeer; disabled?: boolean };

export function CallButtons({ conversationId, peer, disabled }: CallButtonsProps) {
  const { startCall } = useCallActions();
  const phase = useCallStore((s) => s.phase);
  const busy = phase !== 'idle';

  async function start(type: CallType) {
    const ack = await startCall(conversationId, type, peer);
    if (!ack) return;
    useCallStore.getState().markOngoing(ack.callId, Date.now());
    useCallStore.getState().setPendingJoin({ url: ack.livekitUrl, token: ack.livekitToken, type: ack.type });
  }

  return (
    <>
      <Button
        variant="ghost" size="icon-sm" title="Gọi thoại" aria-label="Gọi thoại"
        disabled={disabled || busy} onClick={() => start('AUDIO')}
      >
        <Phone className="h-[18px] w-[18px]" />
      </Button>
      <Button
        variant="ghost" size="icon-sm" title="Gọi video" aria-label="Gọi video"
        disabled={disabled || busy} onClick={() => start('VIDEO')}
      >
        <Video className="h-[18px] w-[18px]" />
      </Button>
    </>
  );
}
```

> Lưu ý: caller `markOngoing` tạm thời được set ngay; khi `call:accepted` về, `onAccepted` đã idempotent (vẫn ongoing). Thực tế caller nên ở "Đang gọi" tới khi accepted — nếu muốn chính xác hơn, bỏ `markOngoing` ở đây và để `onAccepted` xử lý; statusText sẽ là "Đang gọi…" khi `phase==='outgoing'`. **Chọn:** BỎ dòng `markOngoing` ở caller để giữ trạng thái outgoing đúng. Chỉ giữ `setPendingJoin`.

Sửa lại hàm `start`:
```tsx
  async function start(type: CallType) {
    const ack = await startCall(conversationId, type, peer);
    if (!ack) return;
    useCallStore.getState().setPendingJoin({ url: ack.livekitUrl, token: ack.livekitToken, type: ack.type });
  }
```

- [ ] **Step 2: Nối vào ChatHeader** — `src/features/chat/components/layout/ChatHeader.tsx`

Thay 2 nút placeholder (dòng ~103-108):
```tsx
            <Button variant="ghost" size="icon-sm" title="Gọi thoại" aria-label="Gọi thoại">
              <Phone className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Gọi video" aria-label="Gọi video">
              <Video className="h-[18px] w-[18px]" />
            </Button>
```
bằng (chỉ render cho DIRECT):
```tsx
            {conversation.type === 'DIRECT' && (
              <CallButtons
                conversationId={conversation.id}
                peer={{
                  id: conversation.memberIds.find((id) => id !== meId) ?? '',
                  name,
                  avatarUrl: conversation.avatarUrl,
                }}
              />
            )}
```

Thêm import ở đầu file:
```tsx
import { CallButtons } from '@/features/call';
```
Và bỏ import `Phone, Video` khỏi lucide nếu không còn dùng chỗ khác (kiểm tra — nếu còn dùng thì giữ).

- [ ] **Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS (xử lý cảnh báo unused import Phone/Video nếu có).

- [ ] **Step 4: Commit**

```bash
git add src/features/call/components/CallButtons.tsx src/features/chat/components/layout/ChatHeader.tsx
git commit -m "feat(call): add CallButtons and wire into ChatHeader"
```

---

## Task 17: index.ts + mount vào ChatLayout

**Files:**
- Create: `src/features/call/index.ts`
- Modify: `src/features/chat/components/layout/ChatLayout.tsx`

- [ ] **Step 1: Viết `index.ts`** (export tường minh — §14)

```ts
export { CallButtons } from './components/CallButtons';
export { CallContainer } from './components/CallContainer';
export { useCallRealtime } from './hooks/useCallRealtime';
export { useCallHistory } from './hooks/use-query';
export type { CallType, CallPhase, CallPeer } from './types';
```

- [ ] **Step 2: Mount vào ChatLayout** — `src/features/chat/components/layout/ChatLayout.tsx`

Thêm import:
```tsx
import { CallContainer, useCallRealtime } from '@/features/call';
```
Thêm hook cạnh các realtime khác (sau `useFriendRealtime();`):
```tsx
  useCallRealtime();
```
Render `<CallContainer />` trong cả nhánh mobile và desktop return. Desktop — thêm cuối `<div className="flex h-full w-full overflow-hidden">`:
```tsx
      {rightPanelOpen && selectedConversationId && <ContactInfo />}
      <CallContainer />
    </div>
```
Mobile — thêm trước `</div>` đóng của nhánh mobile:
```tsx
        {mobilePanel === 'contact' && selectedConversationId && <ContactInfo />}
        <CallContainer />
      </div>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/call/index.ts src/features/chat/components/layout/ChatLayout.tsx
git commit -m "feat(call): mount call realtime + container in ChatLayout"
```

---

## Task 18: Chạy toàn bộ test + typecheck cuối

- [ ] **Step 1: Full test**

Run: `npm run test`
Expected: tất cả test call PASS, không vỡ test cũ.

- [ ] **Step 2: Typecheck + lint toàn dự án**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Smoke (manual)** — chạy `npm run dev`, mở 2 tab user khác nhau trong conversation DIRECT, bấm nút gọi thoại/video; kiểm tra đổ chuông, bắt máy, mic/cam toggle, kéo cửa sổ, mini/normal/fullscreen, hangup.

- [ ] **Step 4: Commit (nếu có chỉnh)**

```bash
git add -A
git commit -m "test(call): full suite green for audio/video call"
```

---

## Self-review notes (đã rà)

- **Spec coverage:** §1-§16 spec đều có task (deps/env→T1; types/schema/utils→T2; REST/keys→T3; call-socket→T4; livekit→T5; store→T6; livekit hook→T7; actions→T8; realtime→T9; query→T10; UI controls/stage/window/incoming→T11-14; container→T15; buttons+header→T16; mount→T17; test→T18).
- **Group call (out of scope):** `participants` + `participant_*` events được khai báo type nhưng không render grid — đúng phạm vi đợt này.
- **Type consistency:** action names khớp (`startCall`/`acceptCall`/`declineCall`/`cancelCall`/`hangup`/`toggleMic`/`toggleCam`); store methods khớp (`startOutgoing`/`receiveIncoming`/`markOngoing`/`setMic`/`setCam`/`setWindowMode`/`setPosition`/`setPendingJoin`/`reset`).
- **Caller phase:** đã quyết định giữ `outgoing` đến khi `call:accepted` (bỏ `markOngoing` ở CallButtons) — statusText hiển thị "Đang gọi…".
- **Điểm cần kiểm tra runtime khi code:** tên `size` của Button (`icon` vs `icon-sm`), export type của `react-draggable` với React 19 (dùng `nodeRef`), tên export `createLocalTracks`/`RemoteTrack`/`LocalTrack` trong `livekit-client` cài đặt thực tế.
