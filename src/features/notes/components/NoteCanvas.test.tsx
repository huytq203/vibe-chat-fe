import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { FloatingAiButton } from './FloatingAiButton';
import { NoteCanvas } from './NoteCanvas';

vi.mock('@/features/notes/hooks/useAwareness', () => ({
  useAwareness: () => [],
}));

vi.mock('@/features/notes/hooks/useCollabDoc', () => ({
  useCollabDoc: () => ({
    doc: null,
    provider: null,
    status: 'connecting',
    isLocalReady: false,
    isSynced: false,
    error: null,
  }),
}));

vi.mock('@/features/notes/hooks/use-query', () => ({
  usePage: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('./page/Breadcrumb', () => ({
  Breadcrumb: () => <div>Trang hiện tại</div>,
}));

function resetStore(isSidePanelOpen: boolean) {
  useNotesUiStore.setState({ isSidePanelOpen, sidePanelTab: 'comments' });
}

function renderNoteCanvas() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<NoteCanvas pageId="page-1" onSelectPage={vi.fn()} />, { wrapper: Wrapper });
}

beforeEach(() => resetStore(false));

afterEach(() => {
  vi.restoreAllMocks();
  useNotesUiStore.persist.clearStorage();
});

describe('nút AI nổi trên khung soạn thảo', () => {
  it('nên hiện nút AI nổi khi bảng bên đang đóng', () => {
    render(<FloatingAiButton />);

    const button = screen.getByRole('button', { name: 'Mở trợ lý AI' });
    expect(button).toHaveAttribute('title', 'Mở trợ lý AI');
    expect(button).toHaveClass('hidden', 'md:inline-flex');
  });

  it('nên ẩn nút AI nổi khi bảng bên đang mở', () => {
    resetStore(true);
    render(<FloatingAiButton />);

    expect(screen.queryByRole('button', { name: 'Mở trợ lý AI' })).not.toBeInTheDocument();
  });

  it('nên mở bảng bên ở tab AI khi bấm nút AI nổi', async () => {
    const setSidePanelTab = vi.spyOn(useNotesUiStore.getState(), 'setSidePanelTab');
    const setSidePanelOpen = vi.spyOn(useNotesUiStore.getState(), 'setSidePanelOpen');
    render(<FloatingAiButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }));

    expect(setSidePanelTab).toHaveBeenCalledWith('ai');
    expect(setSidePanelOpen).toHaveBeenCalledWith(true);
    expect(setSidePanelTab.mock.invocationCallOrder[0])
      .toBeLessThan(setSidePanelOpen.mock.invocationCallOrder[0]);
    expect(useNotesUiStore.getState()).toMatchObject({
      isSidePanelOpen: true,
      sidePanelTab: 'ai',
    });
  });
});

describe('khung soạn thảo ghi chú', () => {
  it('nên dính thanh tiêu đề lên đầu khi cuộn nội dung', () => {
    const { container } = renderNoteCanvas();

    expect(container.querySelector('header')).toHaveClass('sticky', 'top-0');
  });
});
