'use client';

import { useQuery } from '@tanstack/react-query';
import { AtSign, Send } from 'lucide-react';
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Textarea } from '@/components/ui/textarea/Textarea';
import type { CommentBody, CommentSegment } from '@/features/notes/types';
import { userKeys } from '@/services/keys';
import { usersApi } from '@/services/users.api';

const SEARCH_LIMIT = 8;
const EMPTY_USERS: MentionUser[] = [];
type MentionUser = Awaited<ReturnType<typeof usersApi.search>>['items'][number];
type MentionToken = { start: number; end: number; label: string; userId: string };
type MentionContext = { start: number; query: string };

function mentionContextAt(value: string, caret: number): MentionContext | null {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/(?:^|\s)@([\p{L}\p{N}_.-]*)$/u);
  if (!match) return null;
  return { start: beforeCaret.lastIndexOf('@'), query: match[1] ?? '' };
}

function bodyToDraft(body?: CommentBody): { value: string; tokens: MentionToken[] } {
  let value = '';
  const tokens: MentionToken[] = [];
  for (const segment of body?.segments ?? []) {
    if (segment.type === 'text') { value += segment.text; continue; }
    const label = `@${segment.userId}`;
    tokens.push({ start: value.length, end: value.length + label.length, label,
      userId: segment.userId });
    value += label;
  }
  return { value, tokens };
}

function changedRange(previous: string, next: string) {
  let start = 0;
  while (start < previous.length && start < next.length
    && previous[start] === next[start]) start += 1;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start
    && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  return { start, previousEnd, delta: next.length - previous.length };
}

function moveTokens(tokens: MentionToken[], previous: string, next: string): MentionToken[] {
  const change = changedRange(previous, next);
  return tokens.flatMap((token) => {
    if (token.end <= change.start) return [token];
    if (token.start >= change.previousEnd) {
      return [{ ...token, start: token.start + change.delta, end: token.end + change.delta }];
    }
    return [];
  });
}

function draftToBody(value: string, tokens: MentionToken[]): CommentBody {
  const segments: CommentSegment[] = [];
  let offset = 0;
  for (const token of tokens.toSorted((left, right) => left.start - right.start)) {
    if (value.slice(token.start, token.end) !== token.label) continue;
    if (token.start > offset) segments.push({ type: 'text', text: value.slice(offset, token.start) });
    segments.push({ type: 'mention', userId: token.userId });
    offset = token.end;
  }
  if (offset < value.length) segments.push({ type: 'text', text: value.slice(offset) });
  return { segments };
}

function useMentionDraft(initialBody?: CommentBody) {
  const initial = useMemo(() => bodyToDraft(initialBody), [initialBody]);
  const [value, setValue] = useState(initial.value);
  const [tokens, setTokens] = useState(initial.tokens);
  const [caret, setCaret] = useState(initial.value.length);
  const [dismissed, setDismissed] = useState(false);
  const context = dismissed ? null : mentionContextAt(value, caret);
  const change = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    setTokens((current) => moveTokens(current, value, next));
    setValue(next);
    setCaret(event.target.selectionStart ?? next.length);
    setDismissed(false);
  };
  const select = (user: MentionUser) => {
    if (!context) return;
    const name = user.displayName?.trim() || user.username;
    const label = `@${name}`;
    const next = `${value.slice(0, context.start)}${label} ${value.slice(caret)}`;
    const shifted = moveTokens(tokens, value, next);
    const token = { start: context.start, end: context.start + label.length,
      label, userId: user.id };
    setValue(next);
    setTokens([...shifted, token]);
    setCaret(token.end + 1);
  };
  const reset = () => { setValue(''); setTokens([]); setCaret(0); setDismissed(false); };
  return { body: draftToBody(value, tokens), caret, context, reset, select,
    setCaret, setDismissed, value, change };
}

interface MentionMenuProps {
  activeIndex: number;
  isError: boolean;
  isLoading: boolean;
  items: MentionUser[];
  query: string;
  onSelect: (user: MentionUser) => void;
}

function MentionMenu({ activeIndex, isError, isLoading, items, query,
  onSelect,
}: MentionMenuProps) {
  return (
    <div className="absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-lg border border-border bg-background shadow-md">
      {query.length < 2 && <p className="px-3 py-2 text-xs text-muted-foreground">Gõ thêm ít nhất 2 ký tự để tìm người</p>}
      {query.length >= 2 && isLoading && <div className="space-y-1 p-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>}
      {query.length >= 2 && isError && <p className="px-3 py-2 text-xs text-danger">Không tìm được người dùng. Hãy thử lại.</p>}
      {query.length >= 2 && !isLoading && !isError && items.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy người phù hợp</p>}
      {items.length > 0 && (
        <div role="listbox" aria-label="Chọn người được nhắc đến" className="max-h-52 overflow-y-auto p-1">
          {items.map((user, index) => {
            const name = user.displayName?.trim() || user.username;
            return (
              <button key={user.id} type="button" role="option" aria-selected={index === activeIndex}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-accent"
                onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(user)}>
                <Avatar size="sm" src={user.avatarUrl ?? undefined} alt={name} fallback={name.slice(0, 2)} className="size-7 bg-accent text-muted-foreground" />
                <span className="min-w-0"><span className="block truncate text-foreground">{name}</span><span className="block truncate text-xs text-muted-foreground">@{user.username}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useMentionNavigation(
  query: string,
  context: MentionContext | null,
  items: MentionUser[],
  onSelect: (user: MentionUser) => void,
  onDismiss: (dismissed: boolean) => void,
) {
  const [navigation, setNavigation] = useState({ query: '', index: 0 });
  const activeIndex = navigation.query === query ? navigation.index : 0;
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!context) return;
    if (event.key === 'Escape') { onDismiss(true); return; }
    if (items.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setNavigation({ query, index: (activeIndex + delta + items.length) % items.length });
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSelect(items[activeIndex] ?? items[0]);
    }
  };
  return { activeIndex, onKeyDown };
}

interface CommentComposerProps {
  initialBody?: CommentBody;
  isPending?: boolean;
  onCancel?: () => void;
  onSubmit: (body: CommentBody) => Promise<unknown> | unknown;
  placeholder?: string;
}

export function CommentComposer({ initialBody, isPending = false, onCancel, onSubmit,
  placeholder = 'Viết bình luận…',
}: CommentComposerProps) {
  const draft = useMentionDraft(initialBody);
  const queryText = draft.context?.query.trim() ?? '';
  const search = useQuery({ queryKey: userKeys.search(queryText, SEARCH_LIMIT),
    queryFn: () => usersApi.search({ q: queryText, limit: SEARCH_LIMIT }),
    enabled: queryText.length >= 2, staleTime: 15_000 });
  const items = search.data?.items ?? EMPTY_USERS;
  const navigation = useMentionNavigation(
    queryText, draft.context, items, draft.select, draft.setDismissed,
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isPending || (draft.value.trim().length === 0 && draft.body.segments.length === 0)) return;
    try {
      await onSubmit(draft.body);
      if (!initialBody) draft.reset();
    } catch {
      // Mutation đã hiển thị lỗi thân thiện; giữ nguyên nội dung để người dùng thử lại.
    }
  };

  return (
    <form onSubmit={submit} className="relative space-y-2">
      {draft.context && <MentionMenu activeIndex={navigation.activeIndex} isError={search.isError} isLoading={search.isLoading} items={items} query={queryText} onSelect={draft.select} />}
      <Textarea aria-label={placeholder} value={draft.value} maxLength={2000} placeholder={placeholder} className="min-h-20 resize-none text-base sm:text-sm" disabled={isPending}
        onChange={draft.change} onClick={(event) => draft.setCaret(event.currentTarget.selectionStart)} onKeyDown={navigation.onKeyDown} onKeyUp={(event) => draft.setCaret(event.currentTarget.selectionStart)} />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><AtSign aria-hidden="true" className="size-3.5" />Gõ @ để nhắc người</span>
        <div className="flex items-center gap-2">
          {onCancel && <Button type="button" size="xs" variant="ghost" onClick={onCancel}>Huỷ</Button>}
          <Button type="submit" size="xs" disabled={isPending || draft.value.trim().length === 0}><Send aria-hidden="true" className="size-3.5" />Gửi</Button>
        </div>
      </div>
    </form>
  );
}
