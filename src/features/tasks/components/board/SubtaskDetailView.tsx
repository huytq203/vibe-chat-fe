'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Separator } from '@/components/ui/separator/Separator';
import { SubtaskSidebar } from './SubtaskMetaControls';
import { SubtaskSection } from './SubtaskSection';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { useSubtasksStore, type SubtaskNode } from '../../stores/subtasks.store';
import type { TaskPriority } from '../../types';

// Badge ưu tiên — copy config từ TaskDetailModal để subtask hiển thị giống task cha.
const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  P1: { label: 'Ưu tiên cao', cls: 'bg-red-100 text-red-700' },
  P2: { label: 'Ưu tiên trung bình', cls: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'Ưu tiên thấp', cls: 'bg-green-100 text-green-700' },
};

interface SubtaskDetailViewProps {
  rootId: string;
  node: SubtaskNode;
  projectId: string;
}

/**
 * View chi tiết subtask — layout 2 cột giống modal task cha:
 * trái = content (title, mô tả, danh sách subtask con), phải = SubtaskSidebar.
 * Subtask vẫn là feature local demo (Zustand, chưa có BE API).
 */
export function SubtaskDetailView({ rootId, node, projectId }: SubtaskDetailViewProps) {
  const updateSubtask = useSubtasksStore((s) => s.updateSubtask);
  const navigateBack = useSubtasksStore((s) => s.navigateBack);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const isDone = node.done ?? false;
  const patch = (p: Parameters<typeof updateSubtask>[2]) => updateSubtask(rootId, node.id, p);

  const saveTitle = () => {
    if (titleDraft.trim()) patch({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Breadcrumb / back */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-6 py-3">
        <button
          type="button"
          onClick={navigateBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </button>
        <span className="text-sm text-muted-foreground">/ Task con</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: title, mô tả, subtask con */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
          {editingTitle ? (
            <input
              autoFocus
              className="w-full rounded border border-primary bg-background px-2 py-1 text-2xl font-bold outline-none"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
          ) : (
            <h2
              className={cn(
                'cursor-text text-2xl font-bold leading-tight hover:text-primary',
                // Done → gạch ngang + xám, đồng bộ với danh sách trong SubtaskSection
                isDone && 'text-muted-foreground line-through',
              )}
              onClick={() => {
                setTitleDraft(node.title);
                setEditingTitle(true);
              }}
            >
              {node.title}
            </h2>
          )}

          {node.priority && (
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[node.priority].cls}`}
            >
              {PRIORITY_BADGE[node.priority].label}
            </span>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium">Mô tả</h3>
            <TaskDescriptionEditor
              value={node.description}
              onSave={(html) => patch({ description: html })}
            />
          </div>

          <Separator />

          <div className="mt-1 flex-1">
            <SubtaskSection rootId={rootId} parentId={node.id} projectId={projectId} />
          </div>
        </div>

        {/* Right sidebar — giống TaskDetailSidebar của task cha */}
        <SubtaskSidebar projectId={projectId} node={node} onPatch={patch} />
      </div>
    </div>
  );
}
