import { taskClient } from '../lib/task-client';
import type {
  ChangeRequestSummary,
  CommitmentSummary,
  CreateSourceRefInput,
} from '../types';

export const commitmentsApi = {
  create: (
    projectId: string,
    input: {
      title: string;
      description?: string;
      ownerId?: string;
      promisedAt?: string;
      dueAt?: string;
      scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      sourceRefs?: CreateSourceRefInput[];
    },
    idempotencyKey: string,
  ) =>
    taskClient.post<CommitmentSummary>(
      `/api/v1/projects/${projectId}/commitments`,
      input,
      { 'Idempotency-Key': idempotencyKey },
    ),

  linkSourceRef: (commitmentId: string, input: CreateSourceRefInput) =>
    taskClient.post<void>(
      `/api/v1/commitments/${commitmentId}/source-refs`,
      input,
    ),

  linkTask: (commitmentId: string, taskId: string) =>
    taskClient.post<void>(`/api/v1/commitments/${commitmentId}/tasks`, {
      taskId,
    }),

  // Picker cho LINK_EXISTING_COMMITMENT. Backend chưa hỗ trợ tìm theo tên (`q`) — lấy 1 trang
  // tối đa (limit=100, giới hạn cứng của PaginationQueryDto) rồi filter theo title ở client.
  list: (projectId: string) =>
    taskClient.getPaged<CommitmentSummary[], { total: number }>(
      `/api/v1/projects/${projectId}/commitments?limit=100`,
    ),
};

export const changeRequestsApi = {
  create: (
    projectId: string,
    input: {
      title: string;
      impact: string;
      estimateHours?: number;
      cost?: number;
      timelineShiftDays?: number;
      commitmentId?: string;
      sourceRefs?: CreateSourceRefInput[];
    },
    idempotencyKey: string,
  ) =>
    taskClient.post<ChangeRequestSummary>(
      `/api/v1/projects/${projectId}/change-requests`,
      input,
      { 'Idempotency-Key': idempotencyKey },
    ),
};
