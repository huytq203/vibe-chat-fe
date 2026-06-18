'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

export function useStoreConversation() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: myStoreKeys.conversation(),
    queryFn: () => myStoreApi.getConversation(),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  });
}

export function useStoreMessages() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: myStoreKeys.messages(),
    queryFn: ({ pageParam }) =>
      myStoreApi.listMessages({ limit: 20, before: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: isAuthed,
    staleTime: 60_000,
  });
}

export function useStoreFolders() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: myStoreKeys.folders(),
    queryFn: () => myStoreApi.listFolders(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useStoreFolder(id: string | null) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: id ? myStoreKeys.folder(id) : [...myStoreKeys.all, 'folder', 'null'],
    queryFn: () => myStoreApi.getFolder(id as string),
    enabled: isAuthed && Boolean(id),
    staleTime: 30_000,
  });
}

export function useStoreFiles(folderId: string | null) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: folderId ? myStoreKeys.files(folderId) : [...myStoreKeys.all, 'files', 'null'],
    queryFn: ({ pageParam }) =>
      myStoreApi.listFiles(folderId as string, { limit: 20, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: isAuthed && Boolean(folderId),
    staleTime: 30_000,
  });
}

export function useStoreQuota() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: myStoreKeys.quota(),
    queryFn: () => myStoreApi.getQuota(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
