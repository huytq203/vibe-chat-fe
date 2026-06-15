'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { useAuthStore } from '@/features/auth';
import { expandAllMentions } from '@/features/chat/components/messages/composer-utils';
import { useConversation } from './use-query';
import {
  computeMentionItems,
  mentionItemToAttrs,
  MAX_MENTIONS,
} from './mention-bridge';
import type { MentionItem, MentionListView } from './useMentionSuggest';
import type { ConversationMember, Mention } from '@/features/chat/types';

type PopupState = { open: boolean; items: MentionItem[]; activeIndex: number };
const CLOSED: PopupState = { open: false, items: [], activeIndex: 0 };

/**
 * Cầu nối @mention cho Tiptap: dùng suggestion plugin để mở popup gợi ý cũ
 * (MentionSuggestPopup) + chèn mention node. Tái dùng member của useConversation.
 */
export function useTiptapMention(conversationId: string) {
  const meId = useAuthStore((s) => s.user?.id ?? '');
  const { data: conversation } = useConversation(conversationId);
  const isGroup = conversation?.type === 'GROUP' || conversation?.type === 'CHANNEL';
  const members = useMemo<ConversationMember[]>(
    () => (conversation?.members ?? []).filter((m) => m.userId !== meId),
    [conversation?.members, meId],
  );

  const membersRef = useRef(members);
  const isGroupRef = useRef(isGroup);
  const [state, setState] = useState<PopupState>(CLOSED);
  const stateRef = useRef(state);
  const commandRef = useRef<((item: MentionItem) => void) | null>(null);

  useEffect(() => {
    membersRef.current = members;
    isGroupRef.current = isGroup;
  }, [members, isGroup]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setActiveIndex = (i: number) => setState((s) => ({ ...s, activeIndex: i }));
  const select = (item: MentionItem) => commandRef.current?.(item);

  const suggestion = useMemo<Omit<SuggestionOptions<MentionItem, MentionItem>, 'editor'>>(
    () => ({
      items: ({ query }) => computeMentionItems(query, membersRef.current, isGroupRef.current),
      command: ({ editor, range, props }) =>
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: 'mention', attrs: mentionItemToAttrs(props) },
            { type: 'text', text: ' ' },
          ])
          .run(),
      render: () => ({
        onStart: (p: SuggestionProps<MentionItem, MentionItem>) => {
          commandRef.current = p.command;
          setState({ open: true, items: p.items, activeIndex: 0 });
        },
        onUpdate: (p: SuggestionProps<MentionItem, MentionItem>) => {
          commandRef.current = p.command;
          setState({ open: true, items: p.items, activeIndex: 0 });
        },
        onKeyDown: ({ event }) => handleSuggestKey(event, stateRef.current, setActiveIndex, select),
        onExit: () => {
          commandRef.current = null;
          setState(CLOSED);
        },
      }),
    }),
    [],
  );

  const popup: MentionListView = {
    isOpen: state.open && state.items.length > 0,
    items: state.items,
    activeIndex: state.activeIndex,
    setActiveIndex,
    select,
  };

  const expandMentions = (raw: Mention[]): Mention[] =>
    expandAllMentions(raw, membersRef.current.map((m) => m.userId), MAX_MENTIONS);

  // Getter ổn định (đọc stateRef) → editor capture 1 lần vẫn lấy đúng trạng thái.
  const isMentionOpen = useCallback(
    () => stateRef.current.open && stateRef.current.items.length > 0,
    [],
  );

  return { suggestion, popup, expandMentions, isMentionOpen };
}

function handleSuggestKey(
  event: KeyboardEvent,
  state: PopupState,
  setActiveIndex: (i: number) => void,
  select: (item: MentionItem) => void,
): boolean {
  const len = state.items.length;
  if (!len) return false;
  if (event.key === 'ArrowDown') {
    setActiveIndex((state.activeIndex + 1) % len);
    return true;
  }
  if (event.key === 'ArrowUp') {
    setActiveIndex((state.activeIndex - 1 + len) % len);
    return true;
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    select(state.items[state.activeIndex]);
    return true;
  }
  return false;
}

export type TiptapMention = ReturnType<typeof useTiptapMention>;
