'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Spinner } from '@/components/ui/spinner/Spinner';
import {
  UserResultRow,
  useFriends,
  useUserSearch,
  useSendFriendRequest,
  useCancelFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from '@/features/friends';
import type { UserSearchItem } from '@/features/friends';
import { Avatar } from '../common/Avatar';
import { ConversationItem } from './ConversationItem';
import { getConversationName } from '../../utils';
import type { Conversation } from '../../types';

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onMessageFriend: (user: UserSearchItem) => void;
};

export function SearchOverlay({
  query,
  onQueryChange,
  onBack,
  conversations,
  meId,
  selectedConversationId,
  onSelectConversation,
  onMessageFriend,
}: Props) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  const isSearching = trimmed.length >= MIN_QUERY_LEN;

  const { data: userSearchData, isFetching: userFetching } = useUserSearch(trimmed);
  const userResults = userSearchData?.items ?? [];

  const { data: friendsData } = useFriends();
  const friendItems = friendsData?.items ?? [];

  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const rejectMut = useRejectFriendRequest();

  const pendingId = useMemo(() => {
    if (sendMut.isPending) return sendMut.variables?.targetUserId;
    if (cancelMut.isPending) return cancelMut.variables;
    if (acceptMut.isPending) return acceptMut.variables;
    if (rejectMut.isPending) return rejectMut.variables;
    return undefined;
  }, [
    sendMut.isPending, sendMut.variables,
    cancelMut.isPending, cancelMut.variables,
    acceptMut.isPending, acceptMut.variables,
    rejectMut.isPending, rejectMut.variables,
  ]);

  const friendsSample = useMemo<UserSearchItem[]>(() => {
    if (friendItems.length === 0) return [];
    const arr = friendItems.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 16).map((it) => ({ ...it.user, friendship: 'ACCEPTED' as const }));
  }, [friendItems]);

  const filteredConvs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = getConversationName(c, meId).toLowerCase();
      const preview = (c.lastMessage?.preview ?? '').toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, query, meId]);

  const handleSelect = (id: string) => { onSelectConversation(id); onBack(); };

  return (
    <div className="flex flex-1 flex-col bg-sidebar">
      <div className="flex shrink-0 items-center gap-1 px-2 py-2.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Quay lại" className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          variant="filled"
          icon={<Search className="h-[14px] w-[14px]" />}
          placeholder="Tìm kiếm..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-9 text-[13px]"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults
            userResults={userResults}
            isFetching={userFetching}
            query={trimmed}
            pendingId={pendingId}
            conversations={filteredConvs}
            meId={meId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelect}
            onMessage={onMessageFriend}
            onSend={(u) => sendMut.mutate({ targetUserId: u.id, source: 'SEARCH' })}
            onCancel={(u) => cancelMut.mutate(u.id)}
            onAccept={(u) => acceptMut.mutate(u.id)}
            onReject={(u) => rejectMut.mutate(u.id)}
          />
        ) : (
          <IdleContent
            friendsSample={friendsSample}
            conversations={filteredConvs}
            meId={meId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelect}
            onMessageFriend={onMessageFriend}
          />
        )}
      </div>
    </div>
  );
}

// ─── Idle (no query) ──────────────────────────────────────────────────────────

type IdleProps = {
  friendsSample: UserSearchItem[];
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onMessageFriend: (user: UserSearchItem) => void;
};

function IdleContent({ friendsSample, conversations, meId, selectedConversationId, onSelectConversation, onMessageFriend }: IdleProps) {
  return (
    <>
      {friendsSample.length > 0 && (
        <div className="shrink-0">
          <p className="px-4 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bạn bè
          </p>
          <div className="flex gap-0.5 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {friendsSample.map((user) => {
              const name = user.displayName || user.username;
              return (
                <button
                  key={user.id}
                  onClick={() => onMessageFriend(user)}
                  className="flex min-w-[60px] flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 transition-colors hover:bg-accent/50 active:bg-accent/70"
                >
                  <Avatar name={name} src={user.avatarUrl} seed={user.id} size="md" />
                  <span className="w-[52px] truncate text-center text-[11px] leading-tight text-foreground">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mx-3 mb-1 h-px bg-border/60" />
        </div>
      )}
      <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Gần đây
      </p>
      <div className="px-2 pb-2">
        {conversations.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            selected={selectedConversationId === c.id}
            meId={meId}
            onSelect={onSelectConversation}
          />
        ))}
      </div>
    </>
  );
}

// ─── Search results (query ≥ 2) ───────────────────────────────────────────────

type SearchResultsProps = {
  userResults: UserSearchItem[];
  isFetching: boolean;
  query: string;
  pendingId: string | undefined;
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onMessage: (u: UserSearchItem) => void;
  onSend: (u: UserSearchItem) => void;
  onCancel: (u: UserSearchItem) => void;
  onAccept: (u: UserSearchItem) => void;
  onReject: (u: UserSearchItem) => void;
};

function SearchResults({
  userResults, isFetching, query, pendingId,
  conversations, meId, selectedConversationId,
  onSelectConversation, onMessage, onSend, onCancel, onAccept, onReject,
}: SearchResultsProps) {
  return (
    <div className="pb-2">
      <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Người dùng
      </p>
      {isFetching ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : userResults.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">Không tìm thấy người dùng cho "{query}"</p>
      ) : (
        <div className="flex flex-col gap-0.5 px-2">
          {userResults.map((u) => (
            <UserResultRow
              key={u.id}
              user={u}
              isPending={pendingId === u.id}
              onSend={onSend}
              onCancel={onCancel}
              onAccept={onAccept}
              onReject={onReject}
              onMessage={onMessage}
            />
          ))}
        </div>
      )}

      {conversations.length > 0 && (
        <>
          <div className="mx-3 my-2 h-px bg-border/60" />
          <p className="px-4 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cuộc trò chuyện
          </p>
          <div className="px-2">
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                selected={selectedConversationId === c.id}
                meId={meId}
                onSelect={onSelectConversation}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
