import type { PageRole } from '@/features/notes/types';

export const pageRoleLabels: Record<PageRole, string> = {
  FULL: 'Toàn quyền',
  EDIT: 'Chỉnh sửa',
  COMMENT: 'Bình luận',
  VIEW: 'Chỉ xem',
};

export const pageRoleHints: Record<PageRole, string> = {
  FULL: 'Sửa nội dung và quản lý chia sẻ',
  EDIT: 'Sửa nội dung, không chia sẻ được',
  COMMENT: 'Đọc và bình luận, không sửa được',
  VIEW: 'Chỉ đọc nội dung',
};

/** Cao → thấp: thứ tự hiển thị chung cho mọi menu chọn vai trò. */
export const pageRoleOrder: readonly PageRole[] = ['FULL', 'EDIT', 'COMMENT', 'VIEW'];

export const DEFAULT_PAGE_ROLE: PageRole = 'VIEW';
