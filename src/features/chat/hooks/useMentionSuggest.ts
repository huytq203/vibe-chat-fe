'use client';

import { useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useAuthStore } from '@/features/auth';
import {
  expandAllMentions,
  findMentionQuery,
  insertMention,
  mentionLabel,
  MENTION_ALL,
  MENTION_ALL_LABEL,
} from '@/features/chat/components/messages/composer-utils';
import { useConversation } from './use-query';
import type { ConversationMember, Mention } from '@/features/chat/types';

const MAX_SUGGESTIONS = 8;
/** Trần số mention 1 tin theo BE (04-messages.md). */
const MAX_MENTIONS = 50;

/** 1 dòng gợi ý: `@all` hoặc 1 member cụ thể. */
export type MentionItem =
  | { kind: 'all' }
  | { kind: 'member'; member: ConversationMember };

/** Phần tối thiểu MentionSuggestPopup cần — chung cho contenteditable & Tiptap. */
export type MentionListView = {
  isOpen: boolean;
  items: MentionItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  select: (item: MentionItem) => void;
};

/**
 * Gợi ý @mention cho ô soạn group: dò token `@query` trước caret → lọc member
 * (+ `@all`) → điều hướng bàn phím + chèn chip. Chỉ bật với GROUP/CHANNEL.
 */
export function useMentionSuggest(
  editorRef: RefObject<HTMLDivElement | null>,
  conversationId: string,
) {
  const meId = useAuthStore((s) => s.user?.id ?? '');
  const { data: conversation } = useConversation(conversationId);
  const isGroup = conversation?.type === 'GROUP' || conversation?.type === 'CHANNEL';
  const members = useMemo(
    () => (conversation?.members ?? []).filter((m) => m.userId !== meId),
    [conversation?.members, meId],
  );

  const rangeRef = useRef<Range | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<MentionItem[]>(() => {
    if (query === null || !isGroup) return [];
    const q = query.toLowerCase();
    const list: MentionItem[] = [];
    // `@all` đứng đầu khi query là tiền tố của "all".
    if (MENTION_ALL_LABEL.startsWith(q)) list.push({ kind: 'all' });
    members
      .filter((m) => !q || mentionLabel(m).toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS)
      .forEach((member) => list.push({ kind: 'member', member }));
    return list;
  }, [query, isGroup, members]);

  const isOpen = query !== null && items.length > 0;

  function close() {
    rangeRef.current = null;
    setQuery(null);
    setActiveIndex(0);
  }

  function refresh() {
    const el = editorRef.current;
    if (!el || !isGroup) return close();
    const found = findMentionQuery(el);
    if (!found) return close();
    rangeRef.current = found.range;
    setQuery(found.query);
    setActiveIndex(0);
  }

  function select(item: MentionItem) {
    const range = rangeRef.current;
    if (!range) return;
    if (item.kind === 'all') insertMention(range, MENTION_ALL, MENTION_ALL_LABEL);
    else insertMention(range, item.member.userId, mentionLabel(item.member));
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    close();
  }

  /** Khai triển `@all` → mention từng member, cap 50 (xem composer-utils). */
  function expandMentions(raw: Mention[]): Mention[] {
    return expandAllMentions(raw, members.map((m) => m.userId), MAX_MENTIONS);
  }

  /** Trả true nếu phím được popup tiêu thụ (để composer không xử lý tiếp). */
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): boolean {
    if (!isOpen) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(items[activeIndex]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  }

  return { isOpen, items, activeIndex, setActiveIndex, refresh, select, expandMentions, handleKeyDown };
}

export type MentionSuggest = ReturnType<typeof useMentionSuggest>;
