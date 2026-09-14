import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { TaskDetailModal } from './TaskDetailModal';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/components/ui/dialog/Dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
    onOpenChangeComplete,
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    onOpenChangeComplete?: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={String(open)}>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        Bắt đầu đóng
      </button>
      <button type="button" onClick={() => onOpenChangeComplete?.(false)}>
        Hoàn tất đóng
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('../../hooks/useTaskDetail', () => ({
  useTaskDetail: () => ({ data: undefined, isLoading: true }),
  useUpdateTask: () => ({ mutate: vi.fn() }),
}));

vi.mock('../../hooks/useAttachments', () => ({
  useAttachments: () => ({ data: [] }),
  useUploadAttachment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../../hooks/useTaskCollaboration', () => ({
  useTaskCollaboration: () => ({ presentUserIds: [], emitFieldPatch: vi.fn() }),
}));

describe('TaskDetailModal', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ selectedTaskId: 'task-1', subtaskPath: [] });
  });

  it('keeps the selected task until the close animation completes', () => {
    render(<TaskDetailModal projectId="project-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu đóng' }));

    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false');
    expect(useTasksUIStore.getState().selectedTaskId).toBe('task-1');

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất đóng' }));

    expect(useTasksUIStore.getState().selectedTaskId).toBeNull();
  });
});
