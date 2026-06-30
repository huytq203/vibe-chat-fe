'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Table } from '@/components/ui/table/Table';
import { useBoard } from '../../hooks/useBoard';
import {
  AssigneesControl,
  LabelsControl,
  PrioritySelect,
  StatusSelect,
} from './subtask-controls';
import {
  EMPTY_SUBTASKS,
  findNode,
  useSubtasksStore,
  type SubtaskNode,
  type SubtaskPatch,
} from '../../stores/subtasks.store';
import { Input } from '@/components/ui/input/Input';

interface SubtaskSectionProps {
  rootId: string;
  /** null = cấp gốc của task cha; ngược lại = children của node này. */
  parentId: string | null;
  projectId: string;
}

interface ColumnHandlers {
  rootId: string;
  projectId: string;
  navigateInto: (nodeId: string) => void;
  updateSubtask: (rootId: string, nodeId: string, patch: SubtaskPatch) => void;
  removeSubtask: (rootId: string, nodeId: string) => void;
}

function buildColumns({
  rootId,
  projectId,
  navigateInto,
  updateSubtask,
  removeSubtask,
}: ColumnHandlers): ColumnDef<SubtaskNode>[] {
  return [
    {
      id: 'title',
      header: 'Tên',
      cell: ({ row }) => {
        const node = row.original;
        return (
          <button
            type="button"
            onClick={() => navigateInto(node.id)}
            className="flex min-w-0 items-center gap-1 text-left font-medium hover:text-primary cursor-pointer"
          >
            <span className="truncate">{node.title}</span>
            {node.children.length > 0 && (
              <span className="ml-1 shrink-0 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                {node.children.length}
              </span>
            )}
          </button>
        );
      },
    },
    {
      id: 'status',
      header: 'Trạng thái',
      size:100,
      cell: ({ row }) => (
        <StatusSelect
          projectId={projectId}
          status={row.original.status}
          onChange={(status) => updateSubtask(rootId, row.original.id, { status })}
        />
      ),
    },
    {
      id: 'priority',
      header: 'Ưu tiên',
      cell: ({ row }) => (
        <PrioritySelect
          priority={row.original.priority}
          onChange={(priority) => updateSubtask(rootId, row.original.id, { priority })}
        />
      ),
    },
    {
      id: 'labels',
      header: 'Nhãn',
      cell: ({ row }) => (
        <LabelsControl
          projectId={projectId}
          tagIds={row.original.tagIds}
          onChange={(tagIds) => updateSubtask(rootId, row.original.id, { tagIds })}
        />
      ),
    },
    {
      id: 'assignees',
      header: 'Người thực hiện',
      cell: ({ row }) => (
        <AssigneesControl
          projectId={projectId}
          assigneeIds={row.original.assigneeIds}
          onChange={(assigneeIds) => updateSubtask(rootId, row.original.id, { assigneeIds })}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 40,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => removeSubtask(rootId, row.original.id)}
          aria-label={`Xoá ${row.original.title}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}

export function SubtaskSection({ rootId, parentId, projectId }: SubtaskSectionProps) {
  const tree = useSubtasksStore((s) => s.treesByRoot[rootId]) ?? EMPTY_SUBTASKS;
  const addSubtask = useSubtasksStore((s) => s.addSubtask);
  const updateSubtask = useSubtasksStore((s) => s.updateSubtask);
  const removeSubtask = useSubtasksStore((s) => s.removeSubtask);
  const navigateInto = useSubtasksStore((s) => s.navigateInto);
  const { data: board } = useBoard(projectId);
  const [draft, setDraft] = useState('');

  const nodes = parentId ? (findNode(tree, parentId)?.children ?? EMPTY_SUBTASKS) : tree;

  const columns = useMemo(
    () => buildColumns({ rootId, projectId, navigateInto, updateSubtask, removeSubtask }),
    [rootId, projectId, navigateInto, updateSubtask, removeSubtask],
  );

  const handleAdd = () => {
    const title = draft.trim();
    if (!title) return;
    addSubtask(rootId, parentId, title, board?.columns[0]?.id ?? '');
    setDraft('');
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Task con</h3>

      <Table
        data={[...nodes]}
        columns={columns}
        enableSorting={false}
        pagination={false}
        labels={{ empty: 'Không có task con' }}
      />

      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Thêm task con…"
          className="h-8 flex-1 "
        />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
