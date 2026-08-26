'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pencil, Reply, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import type { UserProfile } from '@/features/friends';
import type { Comment, CommentBody } from '@/features/notes/types';
import { cn } from '@/lib/utils/cn';
import { CommentComposer } from './CommentComposer';

interface CommentBodyViewProps {
  body: CommentBody;
  profiles: ReadonlyMap<string, UserProfile>;
}

function profileName(profile?: UserProfile): string | undefined {
  return profile?.displayName?.trim() || profile?.username.trim() || undefined;
}

function CommentBodyView({ body, profiles }: CommentBodyViewProps) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">
      {body.segments.map((segment, index) => segment.type === 'text' ? (
        <span key={index}>{segment.text}</span>
      ) : (
        <span key={index} className="rounded-sm bg-primary/10 px-1 py-0.5 font-medium text-primary">
          @{profileName(profiles.get(segment.userId)) ?? 'người dùng'}
        </span>
      ))}
    </p>
  );
}

interface CommentActionsProps {
  canEdit: boolean;
  canReply: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onReply: () => void;
}

function CommentActions({ canEdit, canReply, onEdit, onRemove,
  onReply,
}: CommentActionsProps) {
  if (!canEdit && !canReply) return null;
  return (
    <div className="mt-1 flex items-center gap-1">
      {canReply && (
        <Button type="button" size="xs" variant="ghost" className="h-6 px-1.5 text-muted-foreground" onClick={onReply}>
          <Reply aria-hidden="true" className="size-3" />Trả lời
        </Button>
      )}
      {canEdit && (
        <>
          <Button type="button" size="xs" variant="ghost" aria-label="Sửa bình luận" title="Sửa bình luận" className="h-6 px-1.5 text-muted-foreground" onClick={onEdit}>
            <Pencil aria-hidden="true" className="size-3" />Sửa
          </Button>
          <Button type="button" size="xs" variant="ghost" aria-label="Xoá bình luận" title="Xoá bình luận" className="h-6 px-1.5 text-muted-foreground hover:text-danger" onClick={onRemove}>
            <Trash2 aria-hidden="true" className="size-3" />Xoá
          </Button>
        </>
      )}
    </div>
  );
}

interface CommentItemProps {
  canReply: boolean;
  comment: Comment;
  currentUserId?: string;
  depth: 0 | 1;
  onRemove: (comment: Comment) => Promise<unknown>;
  onReply: () => void;
  onUpdate: (comment: Comment, body: CommentBody) => Promise<unknown>;
  profiles: ReadonlyMap<string, UserProfile>;
}

export function CommentItem({ canReply, comment, currentUserId, depth, onRemove,
  onReply, onUpdate, profiles,
}: CommentItemProps) {
  const [isEditing, setEditing] = useState(false);
  const canEdit = currentUserId === comment.authorId;
  const authorProfile = profiles.get(comment.authorId);
  const authorName = comment.author?.displayName.trim()
    || profileName(authorProfile)
    || 'Người dùng Halo';
  const createdAt = new Date(comment.createdAt);
  const remove = () => {
    if (!window.confirm('Xoá bình luận này? Thao tác này không thể hoàn tác.')) return;
    void onRemove(comment).catch(() => undefined);
  };

  return (
    <article data-comment-id={comment.id} data-comment-depth={depth} className={cn('flex min-w-0 gap-2.5', depth === 1 && 'ms-9')}>
      <Avatar size="sm" src={comment.author?.avatarUrl ?? authorProfile?.avatarUrl ?? undefined} alt={authorName} fallback={authorName.slice(0, 2)} className="size-7 bg-accent text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{authorName}</span>
          <time dateTime={comment.createdAt} title={format(createdAt, 'PPpp', { locale: vi })} className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: vi })}
          </time>
        </div>
        {isEditing ? (
          <CommentComposer initialBody={comment.body} placeholder="Sửa bình luận" profiles={profiles} onCancel={() => setEditing(false)} onSubmit={async (body) => {
            await onUpdate(comment, body);
            setEditing(false);
          }} />
        ) : (
          <>
            <CommentBodyView body={comment.body} profiles={profiles} />
            <CommentActions canEdit={canEdit} canReply={canReply} onEdit={() => setEditing(true)} onRemove={remove} onReply={onReply} />
          </>
        )}
      </div>
    </article>
  );
}
