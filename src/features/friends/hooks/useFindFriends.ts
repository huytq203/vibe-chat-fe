'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from './useDebounce';
import { useIncomingFriendRequests, useUserSearch } from './use-query';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useRejectFriendRequest,
  useSendFriendRequest,
} from './use-mutations';
import type { SendFriendRequestInput, UserSearchItem } from '../types';

export type FindFriendsTab = 'search' | 'requests';

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

  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const rejectMut = useRejectFriendRequest();

  const searchItems = search.data?.items ?? [];
  const incomingItems = incoming.data?.items ?? [];

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
