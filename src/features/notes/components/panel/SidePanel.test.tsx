import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { NotesLayout } from '../NotesLayout';

vi.mock('next/navigation', () => ({
  useParams: () => ({ workspaceId: 'workspace-1', pageId: 'page-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/features/notes/hooks/use-query', () => ({
  useWorkspaces: () => ({
    data: [{ id: 'workspace-1' }], isLoading: false, isError: false, refetch: vi.fn(),
  }),
}));
vi.mock('../NoteCanvas', () => ({
  NoteCanvas: () => <main data-testid="notes-canvas" className="flex-1" />,
}));
vi.mock('./CommentThread', () => ({ CommentThread: () => null }));
vi.mock('./VersionList', () => ({ VersionList: () => null }));
vi.mock('./ShareTab', () => ({ ShareTab: () => null }));
vi.mock('../sidebar/FavoriteList', () => ({ FavoriteList: () => null }));
vi.mock('../sidebar/PageTree', () => ({ PageTree: () => null }));
vi.mock('../sidebar/WorkspaceSwitcher', () => ({ WorkspaceSwitcher: () => null }));

function resetStore(isOpen = false) {
  useNotesUiStore.setState({
    activeWorkspaceId: 'workspace-1',
    expandedByWorkspace: {},
    isSidePanelOpen: isOpen,
    sidePanelTab: 'comments',
  });
}

afterEach(() => {
  resetStore();
  useNotesUiStore.persist.clearStorage();
});

describe('bảng bên ghi chú', () => {
  it('nằm cùng luồng flex để đẩy canvas trên desktop và chỉ phủ dưới 1180px', () => {
    resetStore(true);
    render(<NotesLayout />);

    const flow = screen.getByTestId('notes-content-flow');
    const canvas = screen.getByTestId('notes-canvas');
    const panel = screen.getByTestId('notes-side-panel');

    expect(flow).toHaveClass('flex');
    expect(canvas.parentElement).toBe(flow);
    expect(panel.parentElement).toBe(flow);
    expect(panel).toHaveClass('relative', 'w-[360px]');
    expect(panel).not.toHaveClass('absolute', 'fixed');
    expect(panel).toHaveClass('max-[1179px]:fixed', 'max-[1179px]:w-full');
  });

  it('lưu trạng thái mở và tab đang chọn vào store', async () => {
    resetStore(true);
    render(<NotesLayout />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: 'Lịch sử' }));

    expect(useNotesUiStore.getState().isSidePanelOpen).toBe(true);
    expect(useNotesUiStore.getState().sidePanelTab).toBe('versions');
    expect(localStorage.getItem('halo-notes-ui')).toContain('"sidePanelTab":"versions"');

    act(() => useNotesUiStore.getState().setSidePanelOpen(false));
    expect(screen.getByTestId('notes-side-panel')).toHaveClass('w-0');
  });
});
