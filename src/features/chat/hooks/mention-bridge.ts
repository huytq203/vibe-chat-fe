import {
  mentionLabel,
  MENTION_ALL,
  MENTION_ALL_LABEL,
} from '@/features/chat/components/messages/composer-utils';
import type { ConversationMember } from '@/features/chat/types';

/** 1 dòng gợi ý: `@all` hoặc 1 member cụ thể. */
export type MentionItem =
  | { kind: 'all' }
  | { kind: 'member'; member: ConversationMember };

/** Phần tối thiểu MentionSuggestPopup cần để render danh sách gợi ý. */
export type MentionListView = {
  isOpen: boolean;
  items: MentionItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  select: (item: MentionItem) => void;
};

export const MAX_MENTION_SUGGESTIONS = 8;
/** Trần số mention 1 tin theo BE (04-messages.md). */
export const MAX_MENTIONS = 50;

/** Lọc danh sách gợi ý `@query`: `@all` + member khớp tên/username. */
export function computeMentionItems(
  query: string,
  members: ConversationMember[],
  isGroup: boolean,
): MentionItem[] {
  if (!isGroup) return [];
  const q = query.toLowerCase();
  const list: MentionItem[] = [];
  if (MENTION_ALL_LABEL.startsWith(q)) list.push({ kind: 'all' });
  members
    .filter(
      (m) =>
        !q ||
        mentionLabel(m).toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q),
    )
    .slice(0, MAX_MENTION_SUGGESTIONS)
    .forEach((member) => list.push({ kind: 'member', member }));
  return list;
}

/** MentionItem đã chọn → attrs node Tiptap `{ id, label }`. */
export function mentionItemToAttrs(item: MentionItem): { id: string; label: string } {
  return item.kind === 'all'
    ? { id: MENTION_ALL, label: MENTION_ALL_LABEL }
    : { id: item.member.userId, label: mentionLabel(item.member) };
}
