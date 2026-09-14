import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { WorkDeepLinkSync } from './WorkDeepLinkSync';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const replace = vi.fn();

beforeEach(() => {
  replace.mockReset();
  vi.mocked(usePathname).mockReturnValue('/work');
  vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
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

  it('bỏ task khỏi URL sau khi đóng và mở lại khi click cùng link', async () => {
    const view = render(<WorkDeepLinkSync />);

    await waitFor(() => {
      expect(useTasksUIStore.getState().selectedTaskId).toBe('t1');
    });

    act(() => useTasksUIStore.getState().closeTask());

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/work?project=p1', { scroll: false });
    });

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(
      'project=p1',
    ) as ReturnType<typeof useSearchParams>);
    view.rerender(<WorkDeepLinkSync />);

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(
      'project=p1&task=t1',
    ) as ReturnType<typeof useSearchParams>);
    view.rerender(<WorkDeepLinkSync />);

    await waitFor(() => {
      expect(useTasksUIStore.getState().selectedTaskId).toBe('t1');
    });
  });
});
