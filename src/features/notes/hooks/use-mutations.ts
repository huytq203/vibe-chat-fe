'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/error-message';
import { notionKeys } from '@/services/keys';
import {
  favoritesApi,
  invitesApi,
  pagesApi,
  trashApi,
  workspacesApi,
} from '@/services/notion.api';

type CreateWorkspaceInput = {
  name: string;
  icon?: string;
};

type UpdateWorkspaceInput = {
  name?: string;
  icon?: string;
};

type CreateInviteInput = {
  invitedUserId?: string;
  email?: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
};

type CreatePageInput = {
  workspaceId: string;
  parentId?: string;
  title?: string;
};

type UpdatePageInput = {
  icon?: string;
  coverUrl?: string;
};

type UpsertFavoriteInput = {
  pageId: string;
  sortKey?: string;
};

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => workspacesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: notionKeys.workspaces() }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceInput }) =>
      workspacesApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: notionKeys.workspaces() });
      qc.invalidateQueries({ queryKey: notionKeys.workspace(id) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, input }: { workspaceId: string; input: CreateInviteInput }) =>
      workspacesApi.createInvite(workspaceId, input),
    onSuccess: (_, { workspaceId }) =>
      qc.invalidateQueries({ queryKey: notionKeys.members(workspaceId) }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => invitesApi.accept(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: notionKeys.workspaces() }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      workspacesApi.removeMember(workspaceId, userId),
    onSuccess: (_, { workspaceId }) =>
      qc.invalidateQueries({ queryKey: notionKeys.members(workspaceId) }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) => pagesApi.create(input),
    onSuccess: (_, input) =>
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(input.workspaceId, input.parentId ?? null),
      }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePageInput }) =>
      pagesApi.update(id, input),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: notionKeys.page(page.id) });
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(page.workspaceId, page.parentId),
      });
      qc.invalidateQueries({ queryKey: notionKeys.breadcrumb(page.id) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRemovePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; workspaceId: string; parentId: string | null }) =>
      pagesApi.remove(id),
    onSuccess: (_, { workspaceId, parentId }) => {
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, parentId),
      });
      qc.invalidateQueries({ queryKey: notionKeys.trash(workspaceId) });
      qc.invalidateQueries({ queryKey: notionKeys.favorites() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useMovePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId, sortKey }: {
      id: string;
      workspaceId: string;
      parentId: string | null;
      fromParentId: string | null;
      sortKey?: string;
    }) => pagesApi.move(id, { parentId, sortKey }),
    onSuccess: (_, { workspaceId, parentId, fromParentId }) => {
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, parentId),
      });
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, fromParentId),
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertFavoriteInput) => favoritesApi.upsert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: notionKeys.favorites() }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => favoritesApi.remove(pageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: notionKeys.favorites() }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRestoreTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId }: {
      pageId: string;
      workspaceId: string;
      parentId: string | null;
    }) => trashApi.restore(pageId),
    onSuccess: (data, { workspaceId, parentId }) => {
      const targetParentId = data.reparentedToRoot ? null : parentId;
      qc.invalidateQueries({ queryKey: notionKeys.trash(workspaceId) });
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, targetParentId),
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function usePurgeTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId }: { pageId: string; workspaceId: string }) =>
      trashApi.purge(pageId),
    onSuccess: (_, { workspaceId }) => {
      qc.invalidateQueries({ queryKey: notionKeys.trash(workspaceId) });
      qc.invalidateQueries({ queryKey: notionKeys.favorites() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
