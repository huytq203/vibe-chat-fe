import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { BoardHeader } from './BoardHeader';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

vi.mock('../../hooks/useMembers', () => ({
  useMembers: () => ({ data: [] }),
}));

describe('BoardHeader', () => {
  it('nên gọi setBoardView("commitments") khi bấm nút Cam kết', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BoardHeader projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: /cam kết/i }));

    expect(useTasksUIStore.getState().boardView).toBe('commitments');
  });
});
