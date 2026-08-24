'use client';

import { CheckCircle2, MessageSquareText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAuthStore } from '@/features/auth';
import {
  useCreateComment,
  useRemoveComment,
  useUpdateComment,
} from '@/features/notes/hooks/use-mutations';
import { useComments, usePage } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import type { Comment, CommentBody, PageRole } from '@/features/notes/types';
import { cn } from '@/lib/utils/cn';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';

type CommentGroup = { root: Comment; replies: Comment[] };

function findRoot(comment: Comment, byId: Map<string, Comment>): Comment {
  let current = comment;
  const visited = new Set([comment.id]);
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || visited.has(parent.id)) return comment;
    visited.add(parent.id);
    current = parent;
  }
  return current;
}

function groupComments(comments: Comment[]): CommentGroup[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const groups = new Map<string, CommentGroup>();
  for (const comment of comments) {
    const root = findRoot(comment, byId);
    const group = groups.get(root.id) ?? { root, replies: [] };
    if (comment.id !== root.id) group.replies.push(comment);
    groups.set(root.id, group);
  }
  return Array.from(groups.values()).sort(
    (left, right) => Date.parse(left.root.createdAt) - Date.parse(right.root.createdAt),
  );
}

function canComment(role?: PageRole): boolean {
  return role === 'FULL' || role === 'EDIT' || role === 'COMMENT';
}

function canResolve(role: PageRole | undefined, comment: Comment, userId?: string): boolean {
  return comment.authorId === userId || role === 'FULL' || role === 'EDIT';
}

function CommentThreadSkeleton() {
  return (
    <div data-testid="comment-thread-loading" className="space-y-5 p-4">
      {[0, 1].map((index) => (
        <div key={index} className={cn('flex gap-2.5', index === 1 && 'ms-9')}>
          <Skeleton rounded="full" className="size-7 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-12 w-full" /></div>
        </div>
      ))}
    </div>
  );
}

interface ThreadGroupProps {
  canPost: boolean;
  currentUserId?: string;
  group: CommentGroup;
  myRole?: PageRole;
  onRemove: (comment: Comment) => Promise<unknown>;
  onReply: (rootId: string) => void;
  onResolve: (comment: Comment) => Promise<unknown>;
  onUpdate: (comment: Comment, body: CommentBody) => Promise<unknown>;
  replyingTo: string | null;
  submitReply: (root: Comment, body: CommentBody) => Promise<unknown>;
}

function ThreadGroup({ canPost, currentUserId, group, myRole, onRemove, onReply,
  onResolve, onUpdate, replyingTo, submitReply,
}: ThreadGroupProps) {
  const resolved = Boolean(group.root.resolvedAt);
  const itemProps = { canReply: canPost && !resolved, currentUserId, onRemove, onUpdate };
  return (
    <section data-comment-block-id={group.root.blockId ?? 'page'} className={cn('space-y-3 border-b border-border px-4 py-4', resolved && 'opacity-70')}>
      <CommentItem {...itemProps} comment={group.root} depth={0} onReply={() => onReply(group.root.id)} />
      {group.replies.map((reply) => (
        <CommentItem key={reply.id} {...itemProps} comment={reply} depth={1} onReply={() => onReply(group.root.id)} />
      ))}
      {replyingTo === group.root.id && (
        <div className="ms-9"><CommentComposer placeholder="Viết câu trả lời…" onCancel={() => onReply('')} onSubmit={(body) => submitReply(group.root, body)} /></div>
      )}
      {canResolve(myRole, group.root, currentUserId) && (
        <Button type="button" size="xs" variant="ghost" className="ms-9 h-6 px-1.5 text-muted-foreground" onClick={() => void onResolve(group.root).catch(() => undefined)}>
          <CheckCircle2 aria-hidden="true" className="size-3.5" />{resolved ? 'Mở lại luồng' : 'Đánh dấu đã giải quyết'}
        </Button>
      )}
    </section>
  );
}

function useCommentActions(pageId: string, activeBlockId: string | null) {
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const removeComment = useRemoveComment();
  const createRoot = (body: CommentBody) => createComment.mutateAsync({
    pageId, body, blockId: activeBlockId ?? undefined,
  });
  const submitReply = (root: Comment, body: CommentBody) => createComment.mutateAsync({
    pageId, body, blockId: root.blockId ?? undefined, parentId: root.id,
  });
  const update = (comment: Comment, body: CommentBody) => updateComment.mutateAsync({
    pageId, commentId: comment.id, blockId: comment.blockId ?? undefined, body,
  });
  const remove = (comment: Comment) => removeComment.mutateAsync({
    pageId, commentId: comment.id, blockId: comment.blockId ?? undefined,
  });
  const resolve = (comment: Comment) => updateComment.mutateAsync({
    pageId, commentId: comment.id, blockId: comment.blockId ?? undefined,
    resolved: !comment.resolvedAt,
  });
  return { createRoot, isCreating: createComment.isPending, remove, resolve,
    submitReply, update };
}

interface CommentThreadProps {
  pageId: string;
}

export function CommentThread({ pageId }: CommentThreadProps) {
  const commentsQuery = useComments(pageId);
  const pageQuery = usePage(pageId);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const activeBlockId = useNotesUiStore((state) => state.activeCommentBlockId);
  const actions = useCommentActions(pageId, activeBlockId);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupComments(commentsQuery.data ?? []), [commentsQuery.data]);
  const myRole = pageQuery.data?.myRole;
  const canPost = canComment(myRole);

  useEffect(() => {
    if (!activeBlockId || groups.length === 0) return;
    const targets = containerRef.current?.querySelectorAll<HTMLElement>('[data-comment-block-id]');
    const target = Array.from(targets ?? []).find(
      (element) => element.dataset.commentBlockId === activeBlockId,
    );
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [activeBlockId, groups]);

  if (commentsQuery.isLoading) return <CommentThreadSkeleton />;
  if (commentsQuery.isError) return <ErrorState size="sm" message="Không tải được bình luận" onRetry={() => void commentsQuery.refetch()} />;
  if (groups.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={<MessageSquareText aria-hidden="true" />} title="Chưa có bình luận" hint="Hãy bắt đầu cuộc trao đổi đầu tiên." size="sm" />
        {canPost && <CommentComposer isPending={actions.isCreating} onSubmit={actions.createRoot} />}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {groups.map((group) => (
        <ThreadGroup key={group.root.id} canPost={canPost} currentUserId={currentUserId} group={group} myRole={myRole} onRemove={actions.remove} onReply={(rootId) => setReplyingTo(rootId || null)} onResolve={actions.resolve} onUpdate={actions.update} replyingTo={replyingTo} submitReply={(root, body) => actions.submitReply(root, body).then((result) => { setReplyingTo(null); return result; })} />
      ))}
      {canPost && (
        <div className="p-4">
          {activeBlockId && <p className="mb-2 text-xs text-muted-foreground">Bình luận mới sẽ neo vào khối đang chọn</p>}
          <CommentComposer isPending={actions.isCreating} onSubmit={actions.createRoot} />
        </div>
      )}
    </div>
  );
}
