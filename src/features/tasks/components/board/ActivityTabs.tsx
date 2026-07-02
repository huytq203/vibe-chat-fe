'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs/Tabs';
import { Pencil, Trash2 } from 'lucide-react';
import { useComments, useCreateComment, useDeleteComment } from '../../hooks/useComments';
import { useUpdateComment } from '../../hooks/useUpdateComment';
import { useTaskActivities } from '../../hooks/useActivities';
import { getCurrentUser } from '../../lib/current-user';
import type { Comment } from '../../types';

interface ActivityTabsProps {
  projectId: string;
  taskId: string;
}

/** Nhãn tiếng Việt cho từng action activity (khớp action BE phát ra). */
const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.updated': 'đã cập nhật task',
  'task.completed': 'đã hoàn thành task',
  'task.review_requested': 'đã gửi yêu cầu duyệt',
  'task.reopened': 'đã mở lại task',
  'task.archived': 'đã lưu trữ task',
  'comment.created': 'đã bình luận',
  'comment.updated': 'đã sửa bình luận',
  'comment.deleted': 'đã xóa bình luận',
  'checklist.added': 'đã thêm mục checklist',
  'checklist.toggled': 'đã đánh dấu checklist',
  'checklist.updated': 'đã sửa checklist',
  'checklist.deleted': 'đã xóa mục checklist',
  'attachment.added': 'đã đính kèm tệp',
  'attachment.deleted': 'đã xóa tệp đính kèm',
  'assignee.added': 'đã giao việc',
  'assignee.removed': 'đã hủy giao việc',
  'tag.attached': 'đã gắn nhãn',
  'tag.detached': 'đã gỡ nhãn',
};

/** Thời gian tương đối tiếng Việt (vừa xong / X phút trước / …). */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function ActivityTabs({ projectId, taskId }: ActivityTabsProps) {
  const currentUser = getCurrentUser();

  const { data: comments = [] } = useComments(projectId, taskId);
  const createComment = useCreateComment(projectId, taskId);
  const deleteComment = useDeleteComment(projectId, taskId);
  const updateComment = useUpdateComment(projectId, taskId);
  const [commentDraft, setCommentDraft] = useState('');

  // Sửa inline: chỉ cho phép với bình luận của chính mình.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const { data: activities = [] } = useTaskActivities(projectId, taskId);

  const handleSendComment = () => {
    const text = commentDraft.trim();
    if (!text || createComment.isPending || !currentUser) return;
    createComment.mutate(
      { content: text, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  const startEditComment = (c: Comment) => {
    setEditingId(c.id);
    setEditDraft(c.content);
  };

  const cancelEditComment = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const handleSaveEdit = () => {
    const text = editDraft.trim();
    if (!text || !editingId || updateComment.isPending) return;
    updateComment.mutate(
      { commentId: editingId, content: text },
      { onSuccess: cancelEditComment },
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
                      {c.updatedAt !== c.createdAt && ' (đã sửa)'}
                    </span>
                  </div>
                  {editingId === c.id ? (
                    <div className="mt-1">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit();
                          if (e.key === 'Escape') cancelEditComment();
                        }}
                      />
                      <div className="mt-1 flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSaveEdit}
                          disabled={!editDraft.trim() || updateComment.isPending}
                        >
                          {updateComment.isPending ? 'Đang lưu…' : 'Lưu'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={cancelEditComment}
                          disabled={updateComment.isPending}
                        >
                          Huỷ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
                  )}
                </div>
                {currentUser?.userId === c.authorId && editingId !== c.id && (
                  <div className="flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEditComment(c)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Sửa bình luận"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Xoá bình luận"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <strong className="text-foreground">{a.actorName}</strong>{' '}
                  {ACTION_LABELS[a.action] ?? a.action}{' '}
                  <time className="text-[10px]">{formatRelativeTime(a.createdAt)}</time>
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
