import { apiClient } from '@/lib/api/client';
import type { PollData } from '@/features/chat/types';

// ─── Poll (bình chọn) ────────────────────────────────────────────────────────

/** Transport cho bình chọn: tạo/lấy/vote/gỡ vote/thêm lựa chọn/xoá. */
export const pollApi = {
  createPoll: (
    conversationId: string,
    body: {
      question: string;
      options: string[];
      isMultiChoice?: boolean;
      isAnonymous?: boolean;
      allowAddOptions?: boolean;
      hideResultsBeforeVote?: boolean;
      expiresAt?: string | null;
    },
  ) =>
    apiClient.post<PollData>(`/api/v1/polls?conversationId=${conversationId}`, {
      body,
    }),

  getPoll: (pollId: string) => apiClient.get<PollData>(`/api/v1/polls/${pollId}`),

  votePoll: (pollId: string, optionIds: string[]) =>
    apiClient.post<PollData>(`/api/v1/polls/${pollId}/vote`, {
      body: { optionIds },
    }),

  removeVote: (pollId: string, optionId: string) =>
    apiClient.delete<PollData>(`/api/v1/polls/${pollId}/vote/${optionId}`),

  addPollOption: (pollId: string, text: string) =>
    apiClient.post<PollData>(`/api/v1/polls/${pollId}/options`, {
      body: { text },
    }),

  deletePoll: (pollId: string) => apiClient.delete<void>(`/api/v1/polls/${pollId}`),
} as const;
