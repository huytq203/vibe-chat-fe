import { create } from 'zustand';
import type {
  CallDirectory,
  CallParticipant,
  CallPeer,
  CallPhase,
  CallType,
  WindowMode,
} from '@/features/call/types';

type CallData = {
  callId: string | null;
  conversationId: string;
  type: CallType;
  /** Group (≥3 người, không giới hạn) → render lưới video + decline không đóng UI. */
  isGroup: boolean;
  /** Tiêu đề cuộc gọi: 1-1 = peer đối phương; group = tên nhóm. */
  peer: CallPeer;
  /** userId → tên/avatar để gắn nhãn ô trong lưới group. */
  directory: CallDirectory;
};
type CallWindow = { mode: WindowMode; x: number; y: number };
type PendingJoin = { url: string; token: string; type: CallType };

type CallState = {
  phase: CallPhase;
  call: CallData | null;
  participants: CallParticipant[];
  micOn: boolean;
  camOn: boolean;
  startedAt: number | null;
  window: CallWindow;
  /** Cửa sổ call đang hiện hay đã thu gọn về banner (call vẫn diễn ra). */
  windowOpen: boolean;
  /** Token LiveKit của caller chờ CallContainer join (không persist, xoá ngay sau khi join). */
  pendingJoin: PendingJoin | null;
  startOutgoing: (
    conversationId: string,
    type: CallType,
    peer: CallPeer,
    isGroup: boolean,
    directory: CallDirectory,
  ) => void;
  receiveIncoming: (
    callId: string,
    conversationId: string,
    type: CallType,
    peer: CallPeer,
    isGroup: boolean,
    directory: CallDirectory,
  ) => void;
  markOngoing: (callId: string, startedAt: number) => void;
  /** Gắn callId từ ack initiate cho caller (giữ nguyên phase outgoing). */
  attachCallId: (callId: string) => void;
  /** Đồng bộ roster báo hiệu từ ack initiate/accept. */
  setParticipants: (participants: CallParticipant[]) => void;
  /** Nâng audio → video khi 1 phía bật cam hoặc nhận video remote. KHÔNG đụng micOn/camOn. */
  promoteToVideo: () => void;
  /** 1 người vào room (group) — upsert vào roster. */
  participantJoined: (userId: string) => void;
  /** 1 người rời room (group) — gỡ khỏi roster. */
  participantLeft: (userId: string) => void;
  setMic: (on: boolean) => void;
  setCam: (on: boolean) => void;
  setWindowMode: (mode: WindowMode) => void;
  setPosition: (x: number, y: number) => void;
  setWindowOpen: (open: boolean) => void;
  setPendingJoin: (p: PendingJoin | null) => void;
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
  windowOpen: true,
  pendingJoin: null,
  startOutgoing: (conversationId, type, peer, isGroup, directory) =>
    set({
      phase: 'outgoing',
      call: { callId: null, conversationId, type, isGroup, peer, directory },
      participants: [],
      micOn: true,
      camOn: type === 'VIDEO',
      startedAt: null,
      window: INITIAL_WINDOW,
      windowOpen: true,
      pendingJoin: null,
    }),
  receiveIncoming: (callId, conversationId, type, peer, isGroup, directory) =>
    set({
      phase: 'incoming',
      call: { callId, conversationId, type, isGroup, peer, directory },
      participants: [],
      micOn: true,
      camOn: type === 'VIDEO',
      startedAt: null,
      window: INITIAL_WINDOW,
      windowOpen: true,
      pendingJoin: null,
    }),
  markOngoing: (callId, startedAt) =>
    set((s) => ({
      phase: 'ongoing',
      startedAt,
      call: s.call ? { ...s.call, callId: callId || s.call.callId } : s.call,
    })),
  attachCallId: (callId) =>
    set((s) => ({ call: s.call ? { ...s.call, callId } : s.call })),
  setParticipants: (participants) => set({ participants }),
  promoteToVideo: () =>
    set((s) =>
      s.call && s.call.type === 'AUDIO' ? { call: { ...s.call, type: 'VIDEO' } } : {},
    ),
  participantJoined: (userId) =>
    set((s) =>
      s.participants.some((p) => p.userId === userId)
        ? { participants: s.participants.map((p) =>
            p.userId === userId ? { ...p, state: 'JOINED', leftAt: null } : p,
          ) }
        : {
            participants: [
              ...s.participants,
              { userId, state: 'JOINED', joinedAt: null, leftAt: null },
            ],
          },
    ),
  participantLeft: (userId) =>
    set((s) => ({ participants: s.participants.filter((p) => p.userId !== userId) })),
  setMic: (on) => set({ micOn: on }),
  setCam: (on) => set({ camOn: on }),
  setWindowMode: (mode) => set((s) => ({ window: { ...s.window, mode } })),
  setPosition: (x, y) => set((s) => ({ window: { ...s.window, x, y } })),
  setWindowOpen: (open) => set({ windowOpen: open }),
  setPendingJoin: (p) => set({ pendingJoin: p }),
  reset: () =>
    set({
      phase: 'idle',
      call: null,
      participants: [],
      startedAt: null,
      window: INITIAL_WINDOW,
      windowOpen: true,
      pendingJoin: null,
    }),
}));
