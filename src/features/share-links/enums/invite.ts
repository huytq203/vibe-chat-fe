import type { Gender } from '@/features/auth/types';

export const GENDER_LABEL: Partial<Record<Gender, string>> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export const ERROR_LABEL: Record<string, string> = {
  SHARE_LINK_NOT_FOUND: 'Link không tồn tại',
  SHARE_LINK_REVOKED: 'Link đã bị thu hồi',
  SHARE_LINK_EXPIRED: 'Link đã hết hạn',
  SHARE_LINK_EXHAUSTED: 'Link đã hết lượt dùng',
  CONVERSATION_MEMBER_BANNED: 'Bạn đã bị cấm khỏi nhóm',
  CONVERSATION_FULL: 'Nhóm đã đầy',
};

export const PHOTO_HUES = [
  '#7f49e0', '#49a0e0', '#e0495e',
  '#49e0b0', '#e0c849', '#9e75e7',
] as const;

export const MUTUAL_SAMPLES = [
  { av: 'TLA', c: '#e0495e' },
  { av: 'NBT', c: '#49a0e0' },
  { av: 'PKL', c: '#e049c8' },
  { av: 'HĐV', c: '#9e75e7' },
] as const;
