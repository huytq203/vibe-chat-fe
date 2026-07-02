'use client';

import { useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Button } from '@/components/ui/button/Button';
import { CheckCircle2, Clock, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress/Progress';
import { Separator } from '@/components/ui/separator/Separator';
import {
  useChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from '../../hooks/useChecklist';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '../../hooks/useAttachments';
import { ActivityTabs } from './ActivityTabs';
import { SubtaskSection } from './SubtaskSection';

interface Props {
  projectId: string;
  taskId: string;
}

/** Định dạng khoảng thời gian hoàn thành (ms) sang tiếng Việt: "2 ngày 3 giờ" / "5 giờ 12 phút" / "8 phút". */
function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export function TaskDetailLeftPanel({ projectId, taskId }: Props) {
  // Đọc từ cache (đã fetch ở modal) để hiện thời gian hoàn thành trong body
  const { data: task } = useTaskDetail(projectId, taskId);
  const completedLabel =
    task?.status === 'DONE' && task.completedAt
      ? formatDuration(
          new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime(),
        )
      : null;
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

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {/* Banner thời gian hoàn thành (từ lúc tạo → lúc done) — phục vụ owner review */}
      {completedLabel && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Đã hoàn thành</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Thời gian thực hiện: {completedLabel}
          </span>
        </div>
      )}

      {/* Subtasks */}
      <SubtaskSection rootId={taskId} parentId={null} projectId={projectId} />

      <Separator />

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
        {items.length > 0 && <Progress value={progress} className="mb-3 h-1.5" />}
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
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
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

      {/* Activity (Bình luận + Hoạt động) */}
      <ActivityTabs projectId={projectId} taskId={taskId} />
    </div>
  );
}
