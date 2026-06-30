'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs/Tabs';
import { Trash2 } from 'lucide-react';
import { useComments, useCreateComment, useDeleteComment } from '../../hooks/useComments';
import { useTaskActivities } from '../../hooks/useActivities';
import { getCurrentUser } from '../../lib/current-user';

interface ActivityTabsProps {
  projectId: string;
  taskId: string;
}

export function ActivityTabs({ projectId, taskId }: ActivityTabsProps) {
  const currentUser = getCurrentUser();

  const { data: comments = [] } = useComments(projectId, taskId);
  const createComment = useCreateComment(projectId, taskId);
  const deleteComment = useDeleteComment(projectId, taskId);
  const [commentDraft, setCommentDraft] = useState('');

  const { data: activities = [] } = useTaskActivities(projectId, taskId);

  const handleSendComment = () => {
    const text = commentDraft.trim();
    if (!text || createComment.isPending || !currentUser) return;
    createComment.mutate(
      { content: text, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Activity</h3>
      <Tabs defaultValue="comments">
        <TabsList className="mb-3">
          <TabsTrigger value="comments">Bình luận</TabsTrigger>
          <TabsTrigger value="history">Hoạt động</TabsTrigger>
        </TabsList>

        <TabsContent value="comments">
          <div className="mb-3 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar
                  src={c.avatarUrl ?? undefined}
                  alt={c.displayName}
                  fallback={c.displayName.charAt(0).toUpperCase()}
                  className="h-6 w-6 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{c.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
                </div>
                {currentUser?.userId === c.authorId && (
                  <button
                    type="button"
                    onClick={() => deleteComment.mutate(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Xoá bình luận"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có bình luận</p>
            )}
          </div>
          {currentUser && (
            <div className="flex gap-2">
              <Avatar
                src={currentUser.avatarUrl ?? undefined}
                alt={currentUser.displayName}
                fallback={currentUser.displayName.charAt(0).toUpperCase()}
                className="h-6 w-6 shrink-0"
              />
              <div className="flex-1">
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Thêm bình luận…"
                  className="min-h-[60px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendComment();
                  }}
                />
                <Button
                  size="sm"
                  className="mt-1 h-7 text-xs"
                  onClick={handleSendComment}
                  disabled={!commentDraft.trim() || createComment.isPending}
                >
                  Gửi
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-2 text-xs text-muted-foreground">
                <Avatar
                  src={a.actorAvatar ?? undefined}
                  alt={a.actorName}
                  fallback={a.actorName.charAt(0).toUpperCase()}
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  <strong className="text-foreground">{a.actorName}</strong> {a.action}{' '}
                  <time className="text-[10px]">
                    {new Date(a.createdAt).toLocaleString('vi-VN')}
                  </time>
                </span>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có hoạt động</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
