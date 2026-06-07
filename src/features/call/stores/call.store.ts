import { create } from 'zustand';
import type {
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
  peer: CallPeer;
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
  startOutgoing: (conversationId: string, type: CallType, peer: CallPeer) => void;
  receiveIncoming: (
    callId: string,
    conversationId: string,
    type: CallType,
    peer: CallPeer,
  ) => void;
  markOngoing: (callId: string, startedAt: number) => void;
  /** Gắn callId từ ack initiate cho caller (giữ nguyên phase outgoing). */
  attachCallId: (callId: string) => void;
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
  startOutgoing: (conversationId, type, peer) =>
    set({
      phase: 'outgoing',
      call: { callId: null, conversationId, type, peer },
      micOn: true,
      camOn: type === 'VIDEO',
      startedAt: null,
      window: INITIAL_WINDOW,
      windowOpen: true,
      pendingJoin: null,
    }),
  receiveIncoming: (callId, conversationId, type, peer) =>
    set({
      phase: 'incoming',
      call: { callId, conversationId, type, peer },
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
