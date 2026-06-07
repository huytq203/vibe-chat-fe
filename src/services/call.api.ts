import { apiClient } from '@/lib/api/client';
import type { CallEndReason, CallParticipant, CallType } from '@/features/call/types';

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

/** Call REST transport. Pure — báo hiệu đi qua socket /call, không qua đây. */
export const callApi = {
  listHistory: (params: { conversationId?: string; page?: number; limit?: number }) =>
    apiClient.get<CallRecord[]>('/api/v1/calls/history', { query: params }),
  getCall: (callId: string) => apiClient.get<CallRecord>(`/api/v1/calls/${callId}`),
} as const;
