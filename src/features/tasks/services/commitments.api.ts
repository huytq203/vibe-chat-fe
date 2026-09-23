import { taskClient } from '../lib/task-client';
import type {
  ChangeRequestStatusValue,
  ChangeRequestSummary,
  CommitmentDetail,
  CommitmentEvidence,
  CommitmentRiskCode,
  CommitmentSummary,
  CreateSourceRefInput,
  DeliveryStatus,
  EvidenceMilestone,
  EvidenceType,
  PaginationMeta,
} from '../types';
import type { ResolvedMessage } from '@/features/chat/types';

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

  update: (
    commitmentId: string,
    input: {
      title?: string;
      description?: string | null;
      ownerId?: string | null;
      requestedByContactId?: string | null;
      dueAt?: string | null;
      promisedAt?: string | null;
      scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      scopeItemId?: string | null;
      version: number;
    },
  ) =>
    taskClient.patch<CommitmentDetail>(
      `/api/v1/commitments/${commitmentId}`,
      input,
    ),

  unlinkTask: (commitmentId: string, taskId: string) =>
    taskClient.delete<void>(
      `/api/v1/commitments/${commitmentId}/tasks/${taskId}`,
    ),

  addEvidence: (
    commitmentId: string,
    input: {
      milestone: EvidenceMilestone;
      type: EvidenceType;
      url?: string;
      note?: string;
    },
  ) =>
    taskClient.post<CommitmentEvidence>(
      `/api/v1/commitments/${commitmentId}/evidence`,
      input,
    ),

  presignEvidence: (
    commitmentId: string,
    input: {
      milestone: EvidenceMilestone;
      fileName: string;
      mimeType: string;
      fileSize: number;
    },
  ): Promise<{ evidenceId: string; uploadUrl: string }> =>
    taskClient.post<{ evidenceId: string; uploadUrl: string }>(
      `/api/v1/commitments/${commitmentId}/evidence/presign`,
      input,
    ),

  confirmEvidence: (
    commitmentId: string,
    evidenceId: string,
  ): Promise<CommitmentEvidence> =>
    taskClient.post<CommitmentEvidence>(
      `/api/v1/commitments/${commitmentId}/evidence/${evidenceId}/confirm`,
      {},
    ),

  transition: (
    commitmentId: string,
    input: {
      to: DeliveryStatus;
      evidenceId?: string;
      onBehalfOf?: string;
      reason?: string;
      version: number;
    },
  ) =>
    taskClient.post<CommitmentDetail>(
      `/api/v1/commitments/${commitmentId}/transition`,
      input,
    ),

  removeSourceRef: (commitmentId: string, refId: string) =>
    taskClient.delete<void>(
      `/api/v1/commitments/${commitmentId}/source-refs/${refId}`,
    ),

  // Picker cho LINK_EXISTING_COMMITMENT. Backend chưa hỗ trợ tìm theo tên (`q`) — lấy 1 trang
  // tối đa (limit=100, giới hạn cứng của PaginationQueryDto) rồi filter theo title ở client.
  list: (projectId: string) =>
    taskClient.getPaged<CommitmentSummary[], { total: number }>(
      `/api/v1/projects/${projectId}/commitments?limit=100`,
    ),

  listPaged: (
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      deliveryStatus?: DeliveryStatus;
      scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      risk?: CommitmentRiskCode;
      ownerId?: string;
    },
  ) => {
    const sp = new URLSearchParams();
    sp.set('page', String(params.page ?? 1));
    sp.set('limit', String(params.limit ?? 20));
    if (params.deliveryStatus) sp.set('deliveryStatus', params.deliveryStatus);
    if (params.scopeStatus) sp.set('scopeStatus', params.scopeStatus);
    if (params.risk) sp.set('risk', params.risk);
    if (params.ownerId) sp.set('ownerId', params.ownerId);
    return taskClient.getPaged<CommitmentSummary[], PaginationMeta>(
      `/api/v1/projects/${projectId}/commitments?${sp.toString()}`,
    );
  },

  getDetail: (commitmentId: string) =>
    taskClient.get<CommitmentDetail>(`/api/v1/commitments/${commitmentId}`),

  getSourceRefContent: (commitmentId: string, refId: string) =>
    taskClient.get<ResolvedMessage[]>(
      `/api/v1/commitments/${commitmentId}/source-refs/${refId}/content`,
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

  listPaged: (
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ChangeRequestStatusValue;
      commitmentId?: string;
    },
  ) => {
    const sp = new URLSearchParams();
    sp.set('page', String(params.page ?? 1));
    sp.set('limit', String(params.limit ?? 20));
    if (params.status) sp.set('status', params.status);
    if (params.commitmentId) sp.set('commitmentId', params.commitmentId);
    return taskClient.getPaged<ChangeRequestSummary[], PaginationMeta>(
      `/api/v1/projects/${projectId}/change-requests?${sp.toString()}`,
    );
  },

  getDetail: (changeRequestId: string) =>
    taskClient.get<ChangeRequestSummary>(
      `/api/v1/change-requests/${changeRequestId}`,
    ),

  update: (
    changeRequestId: string,
    input: {
      title?: string;
      impact?: string;
      estimateHours?: number;
      cost?: number;
      timelineShiftDays?: number;
      commitmentId?: string;
      version: number;
    },
  ) =>
    taskClient.patch<ChangeRequestSummary>(
      `/api/v1/change-requests/${changeRequestId}`,
      input,
    ),

  transition: (
    changeRequestId: string,
    input: {
      to: ChangeRequestStatusValue;
      onBehalfOf?: string;
      reason?: string;
      sourceRef?: CreateSourceRefInput;
      version: number;
    },
  ) =>
    taskClient.post<ChangeRequestSummary>(
      `/api/v1/change-requests/${changeRequestId}/transition`,
      input,
    ),

  addSourceRef: (changeRequestId: string, input: CreateSourceRefInput) =>
    taskClient.post<void>(
      `/api/v1/change-requests/${changeRequestId}/source-refs`,
      input,
    ),

  removeSourceRef: (changeRequestId: string, refId: string) =>
    taskClient.delete<void>(
      `/api/v1/change-requests/${changeRequestId}/source-refs/${refId}`,
    ),

  getSourceRefContent: (changeRequestId: string, refId: string) =>
    taskClient.get<ResolvedMessage[]>(
      `/api/v1/change-requests/${changeRequestId}/source-refs/${refId}/content`,
    ),
};
