'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/error-message';
import { notionKeys } from '@/services/keys';
import type { CommentBody, CreateShareLinkInput, Page, PageRole, SetPermissionInput,
  UpdateShareLinkInput } from '@/features/notes/types';
import {
  commentsApi, favoritesApi, invitesApi, pagesApi,
  permissionsApi, shareLinksApi, trashApi, versionsApi, workspacesApi,
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
type GrantPermissionsInput = {
  pageId: string;
  grants: { role: PageRole; subjectId: string }[];
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

function useInvalidatingMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: (variables: TVariables) => readonly unknown[],
  exact = false,
) {
  const qc = useQueryClient();
  return useMutation({ mutationFn,
    onSuccess: (_, variables) => qc.invalidateQueries({
      queryKey: queryKey(variables), exact,
    }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
export function useCreateWorkspace() {
  return useInvalidatingMutation((input: CreateWorkspaceInput) =>
    workspacesApi.create(input), () => notionKeys.workspaces());
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
  return useInvalidatingMutation(
    ({ workspaceId, input }: { workspaceId: string; input: CreateInviteInput }) =>
      workspacesApi.createInvite(workspaceId, input),
    ({ workspaceId }) => notionKeys.members(workspaceId));
}
export function useAcceptInvite() {
  return useInvalidatingMutation((token: string) => invitesApi.accept(token),
    () => notionKeys.workspaces());
}
export function useRemoveMember() {
  return useInvalidatingMutation(
    ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      workspacesApi.removeMember(workspaceId, userId),
    ({ workspaceId }) => notionKeys.members(workspaceId));
}
export function useCreatePage() {
  return useInvalidatingMutation((input: CreatePageInput) => pagesApi.create(input),
    (input) => notionKeys.pageChildren(input.workspaceId, input.parentId ?? null));
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
  return useInvalidatingMutation((input: UpsertFavoriteInput) =>
    favoritesApi.upsert(input), () => notionKeys.favorites());
}
export function useRemoveFavorite() {
  return useInvalidatingMutation((pageId: string) => favoritesApi.remove(pageId),
    () => notionKeys.favorites());
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
  return useInvalidatingMutation(
    ({ pageId, label }: { pageId: string; label?: string }) =>
      versionsApi.create(pageId, { label }),
    ({ pageId }) => notionKeys.versions(pageId));
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
export function useSetPermission() {
  return useInvalidatingMutation(
    ({ pageId, input }: { pageId: string; input: SetPermissionInput }) =>
      permissionsApi.set(pageId, input),
    ({ pageId }) => notionKeys.permissions(pageId), true);
}
/** Cấp quyền cho nhiều người một lượt; trả về id những người thất bại để thử lại. */
export function useGrantPermissions() {
  return useInvalidatingMutation(async ({ pageId, grants }: GrantPermissionsInput) => {
    const results = await Promise.allSettled(grants.map((grant) =>
      permissionsApi.set(pageId, { ...grant, subjectType: 'USER' })));
    const failedIds = results.flatMap((result, index) =>
      (result.status === 'rejected' ? [grants[index].subjectId] : []));
    // Hỏng toàn bộ → ném lỗi để onError của wrapper hiện toast chung, không tự nuốt.
    if (failedIds.length === grants.length) {
      const rejected = results.find((result) => result.status === 'rejected');
      const reason: unknown = rejected?.reason;
      throw reason instanceof Error ? reason : new Error('Cấp quyền thất bại');
    }
    return { failedIds, granted: grants.length - failedIds.length };
  }, ({ pageId }) => notionKeys.permissions(pageId), true);
}
export function useRemovePermission() {
  return useInvalidatingMutation(
    ({ pageId, permissionId }: { pageId: string; permissionId: string }) =>
      permissionsApi.remove(pageId, permissionId),
    ({ pageId }) => notionKeys.permissions(pageId), true);
}
export function useCreateShareLink() {
  return useInvalidatingMutation(
    ({ pageId, input }: { pageId: string; input: CreateShareLinkInput }) =>
      shareLinksApi.create(pageId, input),
    ({ pageId }) => notionKeys.shareLink(pageId), true);
}
export function useUpdateShareLink() {
  return useInvalidatingMutation(
    ({ linkId, input }: { pageId: string; linkId: string;
      input: UpdateShareLinkInput }) => shareLinksApi.update(linkId, input),
    ({ pageId }) => notionKeys.shareLink(pageId), true);
}
export function useRemoveShareLink() {
  return useInvalidatingMutation(
    ({ linkId }: { pageId: string; linkId: string }) => shareLinksApi.remove(linkId),
    ({ pageId }) => notionKeys.shareLink(pageId), true);
}
