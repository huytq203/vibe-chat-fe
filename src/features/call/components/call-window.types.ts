import type {
  CallDirectory,
  CallPeer,
  CallPhase,
  CallType,
  WindowMode,
} from '@/features/call/types';

/** Props dùng chung cho mọi biến thể cửa sổ call (desktop card, mobile fullscreen, mini). */
export type CallWindowProps = {
  type: CallType;
  peer: CallPeer;
  isGroup: boolean;
  directory: CallDirectory;
  remoteIds: string[];
  /** Số người trong cuộc gọi (roster báo hiệu) — hiển thị cho group. */
  participantCount: number;
  phase: CallPhase;
  mode: WindowMode;
  micOn: boolean;
  camOn: boolean;
  position: { x: number; y: number };
  statusText: string;
  getRemoteRef: (id: string) => (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
  onRequestUpgrade: () => void;
  onAcceptUpgrade: () => void;
  onDeclineUpgrade: () => void;
  onSetMode: (mode: WindowMode) => void;
  onClose: () => void;
  onDrag: (x: number, y: number) => void;
};
