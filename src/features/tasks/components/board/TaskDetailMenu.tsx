'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { useDeleteTask } from '../../hooks/useTaskDetail';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { useSubtasksStore } from '../../stores/subtasks.store';

interface TaskDetailMenuProps {
  projectId: string;
  taskId: string;
  taskTitle: string;
}

export function TaskDetailMenu({ projectId, taskId, taskTitle }: TaskDetailMenuProps) {
  const closeTask = useTasksUIStore((s) => s.closeTask);
  const resetPath = useSubtasksStore((s) => s.resetPath);
  const deleteTask = useDeleteTask(projectId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        setConfirmOpen(false);
        resetPath();
        closeTask();
      },
    });
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger>
          <button
            type="button"
            aria-label="Thêm thao tác"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" showArrow={false} align="end">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
            Xoá nhiệm vụ
          </button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhiệm vụ?</AlertDialogTitle>
            <AlertDialogDescription>
              Nhiệm vụ <span className="font-semibold text-foreground">{taskTitle}</span> cùng toàn
              bộ subtask, comment, checklist sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteTask.isPending}
            >
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={deleteTask.isPending}>
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
