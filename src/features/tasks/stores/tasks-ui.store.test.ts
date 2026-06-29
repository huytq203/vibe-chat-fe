import { describe, it, expect, beforeEach } from 'vitest';
import { useTasksUIStore } from './tasks-ui.store';

describe('tasks-ui.store activeView', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null });
  });

  it('mặc định activeView là home', () => {
    expect(useTasksUIStore.getState().activeView).toBe('home');
  });

  it('setActiveView đổi view', () => {
    useTasksUIStore.getState().setActiveView('reports');
    expect(useTasksUIStore.getState().activeView).toBe('reports');
  });

  it('chọn project sẽ chuyển sang board', () => {
    useTasksUIStore.getState().setSelectedProjectId('p1');
    expect(useTasksUIStore.getState().selectedProjectId).toBe('p1');
    expect(useTasksUIStore.getState().activeView).toBe('board');
  });

  it('bỏ chọn project (null) quay về home', () => {
    useTasksUIStore.getState().setSelectedProjectId('p1');
    useTasksUIStore.getState().setSelectedProjectId(null);
    expect(useTasksUIStore.getState().activeView).toBe('home');
  });
});
