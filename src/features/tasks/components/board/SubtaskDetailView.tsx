'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator/Separator';
import { SubtaskMetaControls } from './SubtaskMetaControls';
import { SubtaskSection } from './SubtaskSection';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { useSubtasksStore, type SubtaskNode } from '../../stores/subtasks.store';

interface SubtaskDetailViewProps {
  rootId: string;
  node: SubtaskNode;
  projectId: string;
}

export function SubtaskDetailView({ rootId, node, projectId }: SubtaskDetailViewProps) {
  const updateSubtask = useSubtasksStore((s) => s.updateSubtask);
  const navigateBack = useSubtasksStore((s) => s.navigateBack);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const patch = (p: Parameters<typeof updateSubtask>[2]) => updateSubtask(rootId, node.id, p);

  const saveTitle = () => {
    if (titleDraft.trim()) patch({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-1 border-b border-border px-6 py-3">
        <button
          type="button"
          onClick={navigateBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </button>
        <span className="text-sm text-muted-foreground">/ Task con</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
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
            className="cursor-text text-2xl font-bold leading-tight hover:text-primary"
            onClick={() => {
              setTitleDraft(node.title);
              setEditingTitle(true);
            }}
          >
            {node.title}
          </h2>
        )}

        <SubtaskMetaControls projectId={projectId} node={node} onPatch={patch} />

        <div>
          <h3 className="mb-1 text-sm font-medium">Mô tả</h3>
          <TaskDescriptionEditor
            value={node.description}
            onSave={(html) => patch({ description: html })}
          />
        </div>
        

        <Separator />

        <SubtaskSection rootId={rootId} parentId={node.id} projectId={projectId} />
      </div>
    </div>
  );
}
