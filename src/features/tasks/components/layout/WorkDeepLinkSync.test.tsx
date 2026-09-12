import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchParams } from 'next/navigation';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { WorkDeepLinkSync } from './WorkDeepLinkSync';

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }));

beforeEach(() => {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(
    'project=p1&task=t1',
  ) as ReturnType<typeof useSearchParams>);
  useTasksUIStore.setState({
    selectedProjectId: null,
    selectedTaskId: null,
    activeView: 'home',
  });
});

describe('deep link của trang công việc', () => {
  it('nên chọn project rồi mở task từ query string', async () => {
    const selectProject = vi.spyOn(useTasksUIStore.getState(), 'setSelectedProjectId');
    const openTask = vi.spyOn(useTasksUIStore.getState(), 'openTask');

    render(<WorkDeepLinkSync />);

    await waitFor(() => {
      expect(selectProject).toHaveBeenCalledWith('p1');
      expect(openTask).toHaveBeenCalledWith('t1');
    });
    expect(selectProject.mock.invocationCallOrder[0]).toBeLessThan(
      openTask.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });
});
