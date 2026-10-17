import { beforeEach, describe, expect, it } from 'vitest';
import { useTasksUIStore } from './tasks-ui.store';

describe('tasks-ui.store persist', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ isAiPanelOpen: false, selectedProjectId: null });
    window.localStorage.removeItem('halo-tasks-ui');
  });

  it('lưu trạng thái mở panel AI để giữ sau khi tải lại', () => {
    useTasksUIStore.getState().toggleAiPanel();

    const raw = window.localStorage.getItem('halo-tasks-ui') ?? '';
    expect(JSON.parse(raw).state).toEqual({ isAiPanelOpen: true });
  });

  it('không lưu project/view vì chúng đi theo URL', () => {
    useTasksUIStore.getState().setSelectedProjectId('project-1');

    const raw = window.localStorage.getItem('halo-tasks-ui') ?? '';
    expect(raw).not.toContain('project-1');
  });
});
