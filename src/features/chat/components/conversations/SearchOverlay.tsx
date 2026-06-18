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
import { Archive } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { getConversationName } from '@/features/chat/utils';
import type { Conversation } from '@/features/chat/types';

const MY_STORE_KEYWORDS = ['kho', 'my', 'store', 'lưu trữ', 'ghi chú', 'note', 'kho của tôi'];

function matchesMyStore(query: string): boolean {
  const q = query.toLowerCase();
  return MY_STORE_KEYWORDS.some((kw) => kw.includes(q) || q.includes(kw));
}

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  myStoreOpen: boolean;
  onSelectConversation: (id: string) => void;
  onMessageFriend: (user: UserSearchItem) => void;
  onOpenMyStore: () => void;
};

export function SearchOverlay({
  query,
  onQueryChange,
  onBack,
  conversations,
  meId,
  selectedConversationId,
  myStoreOpen,
  onSelectConversation,
  onMessageFriend,
  onOpenMyStore,
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
    // Cuộc trò chuyện đã khóa không xuất hiện trong tìm kiếm thường.
    const visibleConversations = conversations.filter((conversation) => !conversation.isLocked);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleConversations;
    return visibleConversations.filter((conversation) => {
      const name = getConversationName(conversation, meId).toLowerCase();
      const preview = (conversation.lastMessage?.preview ?? '').toLowerCase();
      return name.includes(normalizedQuery) || preview.includes(normalizedQuery);
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
            myStoreOpen={myStoreOpen}
            showMyStore={matchesMyStore(trimmed)}
            onSelectConversation={handleSelect}
            onMessage={onMessageFriend}
            onOpenMyStore={onOpenMyStore}
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
            myStoreOpen={myStoreOpen}
            onSelectConversation={handleSelect}
            onMessageFriend={onMessageFriend}
            onOpenMyStore={onOpenMyStore}
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
  myStoreOpen: boolean;
  onSelectConversation: (id: string) => void;
  onMessageFriend: (user: UserSearchItem) => void;
  onOpenMyStore: () => void;
};

function IdleContent({ friendsSample, conversations, meId, selectedConversationId, myStoreOpen, onSelectConversation, onMessageFriend, onOpenMyStore }: IdleProps) {
  return (
    <>
      <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Gần đây
      </p>
      <div className="px-2 pb-2">
        <MyStoreSearchRow selected={myStoreOpen} onClick={onOpenMyStore} />
        {conversations.slice(0, 5).map((c) => (
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
  myStoreOpen: boolean;
  showMyStore: boolean;
  onSelectConversation: (id: string) => void;
  onMessage: (u: UserSearchItem) => void;
  onOpenMyStore: () => void;
  onSend: (u: UserSearchItem) => void;
  onCancel: (u: UserSearchItem) => void;
  onAccept: (u: UserSearchItem) => void;
  onReject: (u: UserSearchItem) => void;
};

function SearchResults({
  userResults, isFetching, query, pendingId,
  conversations, meId, selectedConversationId,
  myStoreOpen, showMyStore,
  onSelectConversation, onMessage, onOpenMyStore, onSend, onCancel, onAccept, onReject,
}: SearchResultsProps) {
  return (
    <div className="pb-2">
      {showMyStore && (
        <>
          <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kho lưu trữ
          </p>
          <div className="px-2 pb-1">
            <MyStoreSearchRow selected={myStoreOpen} onClick={onOpenMyStore} />
          </div>
          <div className="mx-3 my-2 h-px bg-border/60" />
        </>
      )}
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

// ─── MyStore synthetic search row ────────────────────────────────────────────

function MyStoreSearchRow({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors ${selected ? 'bg-primary/10' : 'hover:bg-muted'}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
        <Archive className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
          Kho của tôi
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">
          Ghi chú · Nhắc nhở · Bookmark · File
        </span>
      </div>
    </button>
  );
}
