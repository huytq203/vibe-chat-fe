'use client';

import { useQuery } from '@tanstack/react-query';
import {
  commentsApi,
  favoritesApi,
  pagesApi,
  trashApi,
  versionsApi,
  workspacesApi,
} from '@/services/notion.api';
import { notionKeys } from '@/services/keys';

export function useWorkspaces() {
  return useQuery({
    queryKey: notionKeys.workspaces(),
    queryFn: () => workspacesApi.list(),
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: notionKeys.members(workspaceId),
    queryFn: () => workspacesApi.members(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

/**
 * `enabled` để cây trang nạp lười theo từng cấp: node chưa mở thì không gọi API con.
 * Mặc định bật, nên người gọi không quan tâm lazy thì dùng như cũ.
 */
export function usePageChildren(
  workspaceId: string,
  parentId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: notionKeys.pageChildren(workspaceId, parentId),
    queryFn: () => pagesApi.listChildren(workspaceId, parentId ?? undefined),
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
  });
}

export function usePage(id: string) {
  return useQuery({
    queryKey: notionKeys.page(id),
    queryFn: () => pagesApi.detail(id),
    enabled: Boolean(id),
  });
}

export function useBreadcrumb(id: string) {
  return useQuery({
    queryKey: notionKeys.breadcrumb(id),
    queryFn: () => pagesApi.breadcrumb(id),
    enabled: Boolean(id),
  });
}

export function useComments(pageId: string, blockId?: string) {
  return useQuery({
    queryKey: notionKeys.comments(pageId, blockId),
    queryFn: () => commentsApi.list(pageId, { blockId }),
    enabled: Boolean(pageId),
  });
}

export function useVersions(pageId: string) {
  return useQuery({
    queryKey: notionKeys.versions(pageId),
    queryFn: () => versionsApi.list(pageId),
    enabled: Boolean(pageId),
  });
}

export function useVersion(versionId: string) {
  return useQuery({
    queryKey: notionKeys.version(versionId),
    queryFn: () => versionsApi.detail(versionId),
    enabled: Boolean(versionId),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: notionKeys.favorites(),
    queryFn: () => favoritesApi.list(),
  });
}

export function useTrash(workspaceId: string) {
  return useQuery({
    queryKey: notionKeys.trash(workspaceId),
    queryFn: () => trashApi.list(workspaceId),
    enabled: Boolean(workspaceId),
  });
}
