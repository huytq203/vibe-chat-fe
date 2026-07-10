/** 7 loại cảm xúc cố định (whitelist) — khớp ReactionType của BE. */
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'THANKS';

/** 1 dòng summary cảm xúc trên 1 tin nhắn (gom theo loại). */
export type MessageReaction = {
  type: ReactionType;
  count: number;
};

/** Trạng thái cảm xúc của 1 tin dưới góc nhìn người gọi — BE trả khi set/remove. */
export type ReactionState = {
  reactions: MessageReaction[];
  total: number;
  myReaction: ReactionType | null;
};

/** 1 người đã thả cảm xúc — dùng cho popup "ai đã react". */
export type Reactor = {
  userId: string;
  type: ReactionType;
  reactedAt: string;
};

/** 1 trang danh sách người đã thả cảm xúc (cursor-based). */
export type ReactorsPage = {
  items: Reactor[];
  nextCursor: string | null;
};
