import type { ChangeRequestStatusValue } from '../types';

export const CHANGE_REQUEST_STATUS_LABELS: Record<
  ChangeRequestStatusValue,
  string
> = {
  DRAFT: 'Nháp',
  INTERNAL_APPROVED: 'Đã duyệt nội bộ',
  SENT: 'Đã gửi khách',
  CLIENT_APPROVED: 'Khách đã duyệt',
  REJECTED: 'Bị từ chối',
};
