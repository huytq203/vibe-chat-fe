/**
 * Cấu hình thả cảm xúc (emoji reaction) cho tin nhắn.
 *
 * Mỗi user 1 cảm xúc/tin (kiểu Messenger). FE dùng `ReactionType` (enum) khớp BE,
 * map sang emoji để hiển thị. API: PUT/DELETE `.../messages/:id/reactions`.
 */
import type { ReactionType } from '@/features/chat/types';

/** Map loại cảm xúc → emoji hiển thị (khớp REACTION_EMOJI của BE). */
export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
  THANKS: '🙏',
};

/** Nhãn tiếng Việt cho tooltip/aria. */
export const REACTION_LABEL: Record<ReactionType, string> = {
  LIKE: 'Thích',
  LOVE: 'Yêu thích',
  HAHA: 'Haha',
  WOW: 'Wow',
  SAD: 'Buồn',
  ANGRY: 'Phẫn nộ',
  THANKS: 'Cảm ơn',
};

/** Thứ tự hiển thị trong thanh cảm xúc nhanh. */
export const QUICK_REACTIONS: readonly ReactionType[] = [
  'LIKE',
  'LOVE',
  'HAHA',
  'WOW',
  'SAD',
  'ANGRY',
  'THANKS',
];
