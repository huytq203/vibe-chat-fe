import type {
  CommitmentRiskCode,
  DeliveryStatus,
  EvidenceMilestone,
} from '../types';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PLANNED: 'Đã lên kế hoạch',
  IN_PROGRESS: 'Đang thực hiện',
  READY: 'Sẵn sàng bàn giao',
  DELIVERED: 'Đã bàn giao',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  ACCEPTED: 'Đã nghiệm thu',
  CANCELLED: 'Đã huỷ',
};

export const RISK_LABELS: Record<CommitmentRiskCode, string> = {
  NO_TASK: 'Chưa có task',
  NO_OWNER: 'Chưa có người phụ trách',
  DUE_SOON_INACTIVE: 'Sắp đến hạn, không hoạt động',
  OVERDUE: 'Quá hạn',
  DONE_NOT_DELIVERED: 'Xong nhưng chưa bàn giao',
  DELIVERED_NOT_ACCEPTED: 'Đã gửi, chưa nghiệm thu',
  WAITING_CLIENT: 'Chờ khách phản hồi',
};

export const SCOPE_STATUS_LABELS: Record<
  'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE',
  string
> = {
  IN_SCOPE: 'Trong phạm vi',
  OUT_OF_SCOPE: 'Ngoài phạm vi',
  UNCLEAR: 'Chưa xác định phạm vi',
};

export const EVIDENCE_MILESTONE_LABELS: Record<
  EvidenceMilestone,
  string
> = {
  IMPLEMENTED: 'Đã code',
  TESTED: 'Đã test',
  DEPLOYED: 'Đã deploy',
  DELIVERED: 'Đã bàn giao',
  ACCEPTED: 'Đã nghiệm thu',
  OTHER: 'Khác',
};
