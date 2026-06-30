'use client';

import { Flag } from 'lucide-react';
import {
  AssigneesControl,
  LabelsControl,
  PrioritySelect,
  StatusSelect,
} from './subtask-controls';
import type { SubtaskNode, SubtaskPatch } from '../../stores/subtasks.store';

interface SubtaskMetaControlsProps {
  projectId: string;
  node: SubtaskNode;
  onPatch: (patch: SubtaskPatch) => void;
}

/** Bộ field status/priority/nhãn/assignee cho view chi tiết subtask (dạng hàng). */
export function SubtaskMetaControls({ projectId, node, onPatch }: SubtaskMetaControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusSelect projectId={projectId} status={node.status} onChange={(status) => onPatch({ status })} />
      <div className="flex items-center gap-1">
        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
        <PrioritySelect priority={node.priority} onChange={(priority) => onPatch({ priority })} />
      </div>
      <LabelsControl
        projectId={projectId}
        tagIds={node.tagIds}
        onChange={(tagIds) => onPatch({ tagIds })}
      />
      <AssigneesControl
        projectId={projectId}
        assigneeIds={node.assigneeIds}
        onChange={(assigneeIds) => onPatch({ assigneeIds })}
      />
    </div>
  );
}
