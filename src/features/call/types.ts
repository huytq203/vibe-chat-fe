export type { QualityLevel } from '@/lib/livekit/room';

/** Tin nhắn chat ephemeral trong cuộc gọi (không lưu lịch sử hội thoại). */
export type CallChatMessage = { id: string; from: string; text: string; mine: boolean };

export type CallType = 'AUDIO' | 'VIDEO';
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'ongoing';
export type WindowMode = 'mini' | 'normal' | 'fullscreen';
export type CallEndReason =
  | 'COMPLETED'
  | 'MISSED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'BUSY'
  | 'FAILED';

export type CallPeer = { id: string; name: string; avatarUrl: string | null };

/** Thông tin hiển thị 1 thành viên trong cuộc gọi (map theo userId). */
export type CallMember = { name: string; avatarUrl: string | null };
/** Danh bạ userId → tên/avatar để gắn nhãn ô video group (resolve từ conversation members). */
export type CallDirectory = Record<string, CallMember>;

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
export type UpgradePayload = { callId: string; by: string };
/** Trạng thái nâng cấp AUDIO→VIDEO: requesting = mình đã xin & chờ; incoming = phía kia xin. */
export type UpgradeState = { state: 'idle' | 'requesting' | 'incoming'; by: string | null };

export type AcceptedPayload = { callId: string; by: string };
export type DeclinedPayload = { callId: string; by: string; reason?: string };
export type CancelledPayload = { callId: string };
export type ParticipantPayload = { callId: string; userId: string };
export type EndedPayload = { callId: string; reason: CallEndReason; durationSec: number };
