import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { BoardHeader } from './BoardHeader';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

vi.mock('../../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

describe('BoardHeader', () => {
  beforeEach(() => useTasksUIStore.setState({ boardView: 'board' }));

  it('chuyển giữa board và danh sách', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BoardHeader projectId="proj-1" />);
    await user.click(screen.getByRole('button', { name: 'Danh sách' }));
    expect(useTasksUIStore.getState().boardView).toBe('list');
    await user.click(screen.getByRole('button', { name: 'Board' }));
    expect(useTasksUIStore.getState().boardView).toBe('board');
  });
});
