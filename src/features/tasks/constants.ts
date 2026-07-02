import type { ProjectStatus } from './types';

/**
 * Whitelist MIME type cho attachment — PHẢI khớp với BE
 * (task-service: attachment-mime.constants.ts). File ngoài danh sách này BE sẽ trả 400.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  // Ảnh
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  // Tài liệu
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Nén
  'application/zip',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-rar-compressed',
  // Media
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
] as const;

/** Giá trị cho thuộc tính `accept` của <input type="file"> */
export const ALLOWED_ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_MIME_TYPES.join(',');

/** Kích thước tối đa cho phép (bytes) — khớp @Max của BE PresignAttachmentDto */
export const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

type BadgeVariant = 'outline' | 'soft-primary' | 'soft-success' | 'soft-warning' | 'soft-danger';

/** Nhãn + màu badge cho từng trạng thái project owner đặt tay. */
export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant }
> = {
  PLANNING: { label: 'Khởi tạo', variant: 'outline' },
  ACTIVE: { label: 'Đang làm', variant: 'soft-primary' },
  PENDING: { label: 'Tạm dừng', variant: 'soft-warning' },
  COMPLETED: { label: 'Kết thúc', variant: 'soft-success' },
};

/** Badge riêng cho trạng thái suy diễn "Quá hạn" (ưu tiên hiển thị hơn status). */
export const PROJECT_OVERDUE_META = { label: 'Quá hạn', variant: 'soft-danger' as BadgeVariant };

/** Thứ tự hiển thị trong selector đổi trạng thái. */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'PLANNING',
  'ACTIVE',
  'PENDING',
  'COMPLETED',
];
