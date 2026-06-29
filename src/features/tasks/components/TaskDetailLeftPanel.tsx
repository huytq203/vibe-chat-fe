'use client';

import { useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress/Progress';
import { Separator } from '@/components/ui/separator/Separator';
import {
  useChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from '../hooks/useChecklist';
import { useComments, useCreateComment, useDeleteComment } from '../hooks/useComments';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '../hooks/useAttachments';
import { useTaskActivities } from '../hooks/useActivities';
import { getCurrentUser } from '../lib/current-user';

interface Props {
  projectId: string;
  taskId: string;
}

export function TaskDetailLeftPanel({ projectId, taskId }: Props) {
  const currentUser = getCurrentUser();

  // Checklist
  const { data: items = [] } = useChecklist(projectId, taskId);
  const createItem = useCreateChecklistItem(projectId, taskId);
  const updateItem = useUpdateChecklistItem(projectId, taskId);
  const deleteItem = useDeleteChecklistItem(projectId, taskId);
  const [newItemText, setNewItemText] = useState('');

  const doneCount = items.filter((i) => i.isDone).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const handleAddItem = () => {
    const text = newItemText.trim();
    if (!text || createItem.isPending) return;
    createItem.mutate(text, { onSuccess: () => setNewItemText('') });
  };

  // Comments
  const { data: comments = [] } = useComments(projectId, taskId);
  const createComment = useCreateComment(projectId, taskId);
  const deleteComment = useDeleteComment(projectId, taskId);
  const [commentDraft, setCommentDraft] = useState('');

  const handleSendComment = () => {
    const text = commentDraft.trim();
    if (!text || createComment.isPending || !currentUser) return;
    createComment.mutate(
      {
        content: text,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  // Attachments
  const { data: attachments = [] } = useAttachments(projectId, taskId);
  const uploadAttachment = useUploadAttachment(projectId, taskId);
  const deleteAtt = useDeleteAttachment(projectId, taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Activities
  const { data: activities = [] } = useTaskActivities(projectId, taskId);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {/* Checklist */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Checklist</h3>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {doneCount}/{items.length}
            </span>
          )}
        </div>
        {items.length > 0 && <Progress value={progress} className="mb-2 h-1.5" />}
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
            >
              <Checkbox
                checked={item.isDone}
                onCheckedChange={(checked) =>
                  updateItem.mutate({ itemId: item.id, isDone: !!checked })
                }
              />
              <span
                className={`flex-1 text-sm ${item.isDone ? 'text-muted-foreground line-through' : ''}`}
              >
                {item.content}
              </span>
              <button
                type="button"
                onClick={() => deleteItem.mutate(item.id)}
                className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
            }}
            placeholder="Thêm mục…"
            className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
          />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddItem}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      <Separator />

      {/* Attachments */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Tệp đính kèm</h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploadAttachment.isPending ? 'Đang tải…' : 'Tải lên'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="space-y-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-primary hover:underline"
              >
                {att.originalName}
              </a>
              <span className="text-xs text-muted-foreground">
                {(att.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => deleteAtt.mutate(att.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {attachments.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có tệp đính kèm</p>
          )}
        </div>
      </section>

      <Separator />

      {/* Comments */}
      <section>
        <h3 className="mb-2 text-sm font-medium">Bình luận</h3>
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
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
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
      </section>

      <Separator />

      {/* Activity */}
      <section>
        <h3 className="mb-2 text-sm font-medium">Hoạt động</h3>
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
                {a.action}{' '}
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
      </section>
    </div>
  );
}
