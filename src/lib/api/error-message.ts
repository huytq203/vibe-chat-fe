import { ApiError } from './client';

/**
 * Bản đồ mã lỗi BE (UPPER_SNAKE) → thông điệp tiếng Việt cho người dùng.
 * FE bắt theo `code` thay vì `message` để không phụ thuộc i18n của server.
 * Nguồn: FRONTEND/12-error-codes.md. Mã không có ở đây → fallback message từ server.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  AUTH_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',

  // User & profile
  USER_NOT_FOUND: 'Người dùng không tồn tại',
  MEDIA_NOT_FOUND: 'Ảnh không hợp lệ — vui lòng tải lên lại',
  MEDIA_NOT_OWNED: 'Ảnh không hợp lệ — vui lòng tải lên lại',
  MEDIA_NOT_UPLOADED: 'Ảnh chưa tải lên xong',

  // Share link
  SHARE_LINK_NOT_FOUND: 'Link không tồn tại',
  SHARE_LINK_REVOKED: 'Link đã bị thu hồi',
  SHARE_LINK_EXPIRED: 'Link đã hết hạn',
  SHARE_LINK_EXHAUSTED: 'Link đã hết lượt dùng',
  SHARE_LINK_TARGET_INVALID: 'Vui lòng chọn nhóm cho link',

  // Conversation
  CONVERSATION_NOT_FOUND: 'Cuộc trò chuyện không tồn tại',
  CONVERSATION_MEMBER_REQUIRED: 'Bạn không có trong cuộc trò chuyện này',
  CONVERSATION_NOT_OWNER: 'Chỉ chủ nhóm mới thực hiện được thao tác này',
  CONVERSATION_NOT_GROUP: 'Thao tác chỉ áp dụng cho nhóm',
  CONVERSATION_NOT_PUBLIC: 'Nhóm này không cho phép xin tham gia',
  CONVERSATION_INSUFFICIENT_ROLE: 'Bạn không đủ quyền thực hiện thao tác này',
  CONVERSATION_MEMBER_EXISTS: 'Bạn đã là thành viên của nhóm',
  CONVERSATION_MEMBER_BANNED: 'Bạn đã bị cấm khỏi nhóm',
  CONVERSATION_FULL: 'Nhóm đã đầy',
  CONVERSATION_TARGET_NOT_MEMBER: 'Người này không phải thành viên nhóm',
  CONVERSATION_CANNOT_REMOVE_SELF: 'Dùng "Rời nhóm" thay vì tự xoá mình',
  CONVERSATION_CANNOT_REMOVE_OWNER: 'Không thể thao tác lên chủ nhóm',
  CONVERSATION_OWNER_CANNOT_LEAVE: 'Chủ nhóm phải chuyển quyền hoặc xoá nhóm trước',
  CONVERSATION_EDIT_INFO_RESTRICTED: 'Chỉ quản trị viên được sửa thông tin nhóm',
  CONVERSATION_SEND_RESTRICTED: 'Chỉ quản trị viên được nhắn trong nhóm này',
  CONVERSATION_PIN_RESTRICTED: 'Bạn không có quyền ghim tin trong nhóm này',
  CONVERSATION_JOIN_LINK_DISABLED: 'Nhóm không cho tham gia qua link',
  CONVERSATION_MEMBER_ALREADY_BANNED: 'Thành viên này đã bị chặn',
  CONVERSATION_NOT_BANNED: 'Thành viên này chưa bị chặn',

  // Pin message
  PIN_LIMIT_REACHED: 'Tối đa 5 tin ghim — hãy bỏ bớt rồi ghim lại',
  MESSAGE_ALREADY_PINNED: 'Tin này đã được ghim',
  MESSAGE_NOT_PINNED: 'Tin này chưa được ghim',

  // Message
  MESSAGE_NOT_OWNED: 'Bạn chỉ thao tác được tin của mình',
  MESSAGE_TOO_LONG: 'Tin nhắn quá dài (tối đa 5000 ký tự)',
  MESSAGE_EDIT_WINDOW_EXPIRED: 'Đã quá 5 phút — không thể sửa tin này',
  MESSAGE_ALREADY_DELETED: 'Tin nhắn đã bị thu hồi',

  // Friends & blocks
  FRIEND_BLOCKED: 'Không thể thực hiện thao tác này',
  FRIEND_ALREADY_FRIENDS: 'Hai bạn đã là bạn bè',

  // Generic
  INTERNAL_ERROR: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
};

/**
 * Lấy thông điệp tiếng Việt cho 1 lỗi bất kỳ: ưu tiên map theo `code`, sau đó dùng
 * `message` từ server, cuối cùng fallback chung. Dùng cho mọi `onError` của mutation.
 */
export function getErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra'): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
