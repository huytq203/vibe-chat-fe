'use client';

import { useCallback, useMemo, useState } from 'react';
import type { UIEvent } from 'react';
import { useDebouncedValue } from './useDebounce';
import {
  useFriends,
  useFriendsInfinite,
  useIncomingFriendRequests,
  useUserSearch,
} from './use-query';
import { useGroupsInfinite } from '@/features/chat';
import type { Conversation } from '@/features/chat/types';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useRejectFriendRequest,
  useSendFriendRequest,
} from './use-mutations';
import type { SendFriendRequestInput, UserSearchItem } from '@/features/friends/types';

export type FindFriendsTab = 'search' | 'friends' | 'groups' | 'requests';

// PRNG deterministic (mulberry32) để shuffle ổn định trong render từ 1 seed cố định.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useFindFriends() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FindFriendsTab>('search');
  const [targetForNickname, setTargetForNickname] = useState<UserSearchItem | null>(
    null,
  );

  const debouncedQuery = useDebouncedValue(query, 300);
  const trimmedQuery = debouncedQuery.trim();
  const isShortQuery = trimmedQuery.length > 0 && trimmedQuery.length < 2;

  const search = useUserSearch(debouncedQuery);
  const incoming = useIncomingFriendRequests();
  const friends = useFriends();
  const friendsList = useFriendsInfinite();
  const groupsList = useGroupsInfinite();

  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const rejectMut = useRejectFriendRequest();

  const searchItems = search.data?.items ?? [];
  const incomingItems = incoming.data?.items ?? [];
  const friendsItems = friends.data?.items ?? [];

  const FRIENDS_SAMPLE_SIZE = 8;
  // Seed sinh 1 lần ngoài render → giữ tính ngẫu nhiên nhưng thuần khiết trong render.
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const friendsSample = useMemo<UserSearchItem[]>(() => {
    if (friendsItems.length === 0) return [];
    const rand = mulberry32(shuffleSeed);
    const arr = friendsItems.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, FRIENDS_SAMPLE_SIZE).map((it) => ({
      ...it.user,
      friendship: 'ACCEPTED' as const,
    }));
  }, [friendsItems, shuffleSeed]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setTab((prev) => (prev === 'search' ? prev : 'search'));
    },
    [],
  );

  const handleSendClick = useCallback((user: UserSearchItem) => {
    setTargetForNickname(user);
  }, []);

  const handleConfirmSend = useCallback(
    (input: { nickname?: string }) => {
      if (!targetForNickname) return;
      const payload: SendFriendRequestInput = {
        targetUserId: targetForNickname.id,
        nickname: input.nickname,
        source: 'SEARCH',
      };
      sendMut.mutate(payload, {
        onSuccess: () => setTargetForNickname(null),
      });
    },
    [sendMut, targetForNickname],
  );

  const closeNicknameDialog = useCallback(() => setTargetForNickname(null), []);

  const searchPendingId = useMemo(() => {
    if (sendMut.isPending) return sendMut.variables?.targetUserId;
    if (cancelMut.isPending) return cancelMut.variables;
    return undefined;
  }, [sendMut.isPending, sendMut.variables, cancelMut.isPending, cancelMut.variables]);

  const requestsPendingId = useMemo(() => {
    if (acceptMut.isPending) return acceptMut.variables;
    if (rejectMut.isPending) return rejectMut.variables;
    return undefined;
  }, [acceptMut.isPending, acceptMut.variables, rejectMut.isPending, rejectMut.variables]);

  const friendListItems = useMemo(
    () => friendsList.data?.pages.flatMap((p) => p.items) ?? [],
    [friendsList.data],
  );

  // Gom các trang conversation rồi lọc GROUP phía FE (xem useGroupsInfinite).
  const groupItems = useMemo<Conversation[]>(
    () =>
      groupsList.data?.pages
        .flat()
        .filter((c) => c.type === 'GROUP') ?? [],
    [groupsList.data],
  );

  // Lazy load chung cho tab đang mở: cuộn gần đáy → nạp trang kế của đúng query.
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight >= 80) return;
      if (tab === 'friends' && friendsList.hasNextPage && !friendsList.isFetchingNextPage) {
        void friendsList.fetchNextPage();
      } else if (tab === 'groups' && groupsList.hasNextPage && !groupsList.isFetchingNextPage) {
        void groupsList.fetchNextPage();
      }
    },
    [tab, friendsList, groupsList],
  );

  return {
    query,
    setQuery: handleQueryChange,
    tab,
    setTab,
    trimmedQuery,
    isShortQuery,

    search: {
      items: searchItems,
      isLoading: search.isFetching && trimmedQuery.length >= 2,
      isError: search.isError,
      pendingId: searchPendingId,
    },
    incoming: {
      items: incomingItems,
      isLoading: incoming.isLoading,
      pendingId: requestsPendingId,
    },
    friends: {
      sample: friendsSample,
      total: friendsItems.length,
      isLoading: friends.isLoading,
    },
    friendsList: {
      items: friendListItems,
      isLoading: friendsList.isLoading,
      isError: friendsList.isError,
      isFetchingMore: friendsList.isFetchingNextPage,
    },
    groupsList: {
      items: groupItems,
      isLoading: groupsList.isLoading,
      isError: groupsList.isError,
      isFetchingMore: groupsList.isFetchingNextPage,
    },
    onScroll: handleScroll,

    nicknameTarget: targetForNickname,
    isSending: sendMut.isPending,
    closeNicknameDialog,
    onSendClick: handleSendClick,
    onConfirmSend: handleConfirmSend,
    onCancelRequest: useCallback((u: UserSearchItem) => cancelMut.mutate(u.id), [cancelMut]),
    onAcceptUser: useCallback((u: UserSearchItem) => acceptMut.mutate(u.id), [acceptMut]),
    onRejectUser: useCallback((u: UserSearchItem) => rejectMut.mutate(u.id), [rejectMut]),
    onAcceptRequest: useCallback((id: string) => acceptMut.mutate(id), [acceptMut]),
    onRejectRequest: useCallback((id: string) => rejectMut.mutate(id), [rejectMut]),
  };
}
