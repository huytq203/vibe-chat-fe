'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/error-message';
import { notionKeys } from '@/services/keys';
import type { CommentBody, Page } from '@/features/notes/types';
import {
  commentsApi, favoritesApi, invitesApi, pagesApi,
  trashApi, versionsApi, workspacesApi,
} from '@/services/notion.api';

type CreateWorkspaceInput = { name: string; icon?: string };
type UpdateWorkspaceInput = { name?: string; icon?: string };
type CreateInviteInput = { invitedUserId?: string; email?: string; role: 'ADMIN' | 'MEMBER' | 'GUEST' };
type CreatePageInput = { workspaceId: string; parentId?: string; title?: string };
type UpdatePageInput = { icon?: string | null; coverUrl?: string | null };
type UpsertFavoriteInput = { pageId: string; sortKey?: string };
type MovePageInput = {
  id: string; workspaceId: string;
  parentId: string | null; fromParentId: string | null;
  sortKey?: string;
};

type PageChildrenKey = ReturnType<typeof notionKeys.pageChildren>;
type MovePageContext = {
  fromKey: PageChildrenKey; toKey: PageChildrenKey;
  fromPages: Page[] | undefined; toPages: Page[] | undefined;
};
type CommentScope = { pageId: string; blockId?: string };
type CreateCommentInput = CommentScope & { body: CommentBody; parentId?: string };
type UpdateCommentInput = CommentScope & {
  commentId: string; body?: CommentBody; resolved?: boolean;
};

function movePageInList(pages: Page[], input: MovePageInput, moved: Page) {
  const nextPage = {
    ...moved,
    parentId: input.parentId,
    sortKey: input.sortKey ?? moved.sortKey,
  };
  const nextPages = [...pages.filter((page) => page.id !== input.id), nextPage];
  if (!input.sortKey) return nextPages;
  return nextPages.sort((left, right) => {
    if (left.sortKey === right.sortKey) return 0;
    return left.sortKey < right.sortKey ? -1 : 1;
  });
}

function invalidateComments(qc: QueryClient, pageId: string, blockId?: string) {
  const requests = [
    qc.invalidateQueries({ queryKey: notionKeys.comments(pageId), exact: true }),
  ];
  if (blockId) {
    requests.push(
      qc.invalidateQueries({ queryKey: notionKeys.comments(pageId, blockId), exact: true }),
    );
  }
  return Promise.all(requests);
}

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
  return useMutation<Page, Error, MovePageInput, MovePageContext>({
    mutationFn: ({ id, parentId, sortKey }) => pagesApi.move(id, { parentId, sortKey }),
    onMutate: async (input) => {
      const fromKey = notionKeys.pageChildren(input.workspaceId, input.fromParentId);
      const toKey = notionKeys.pageChildren(input.workspaceId, input.parentId);
      await Promise.all([
        qc.cancelQueries({ queryKey: fromKey }),
        qc.cancelQueries({ queryKey: toKey }),
      ]);
      const fromPages = qc.getQueryData<Page[]>(fromKey);
      const toPages = qc.getQueryData<Page[]>(toKey);
      const moved = fromPages?.find((page) => page.id === input.id);
      if (moved && input.fromParentId === input.parentId && fromPages) {
        qc.setQueryData(fromKey, movePageInList(fromPages, input, moved));
      } else if (moved) {
        qc.setQueryData(fromKey, fromPages?.filter((page) => page.id !== input.id));
        if (toPages) qc.setQueryData(toKey, movePageInList(toPages, input, moved));
      }
      return { fromKey, toKey, fromPages, toPages };
    },
    onError: (error, _input, context) => {
      if (context) {
        qc.setQueryData(context.fromKey, context.fromPages);
        qc.setQueryData(context.toKey, context.toPages);
      }
      toast.error(getErrorMessage(error));
    },
    onSettled: (_, _error, { workspaceId, parentId, fromParentId }) => {
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, parentId),
      });
      qc.invalidateQueries({
        queryKey: notionKeys.pageChildren(workspaceId, fromParentId),
      });
    },
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

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, ...input }: CreateCommentInput) => commentsApi.create(pageId, input),
    onSuccess: (_, { pageId, blockId }) => invalidateComments(qc, pageId, blockId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body, resolved }: UpdateCommentInput) =>
      commentsApi.update(commentId, { body, resolved }),
    onSuccess: (_, { pageId, blockId }) => invalidateComments(qc, pageId, blockId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRemoveComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: CommentScope & { commentId: string }) =>
      commentsApi.remove(commentId),
    onSuccess: (_, { pageId, blockId }) => invalidateComments(qc, pageId, blockId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, label }: { pageId: string; label?: string }) =>
      versionsApi.create(pageId, { label }),
    onSuccess: (_, { pageId }) =>
      qc.invalidateQueries({ queryKey: notionKeys.versions(pageId) }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionsApi.restore(versionId),
    onSuccess: ({ pageId }) => Promise.all([
      qc.invalidateQueries({ queryKey: notionKeys.versions(pageId) }),
      qc.invalidateQueries({ queryKey: notionKeys.page(pageId) }),
    ]),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
