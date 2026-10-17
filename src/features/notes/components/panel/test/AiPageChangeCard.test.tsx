import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPageChangeCard } from '@/features/notes/components/panel/AiPageChangeCard';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import type { PageVersion } from '@/features/notes/types';

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
  isMobile: false,
}));

vi.mock('@/services/notion.api', () => ({
  versionsApi: { restore: mocks.restore },
}));
vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => mocks.isMobile,
}));

const version: PageVersion = {
  id: 'version-ai', pageId: 'page-1', kind: 'BEFORE_AI', label: null,
  sizeBytes: 10, preview: '', createdBy: 'ai', createdAt: '2026-09-10T00:00:00.000Z',
};

function renderCard(onRestored = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={client}>
      <AiPageChangeCard
        pageId="page-1"
        pageTitle="Kế hoạch quý"
        version={version}
        onRestored={onRestored}
      />
    </QueryClientProvider>,
  );
  return { ...result, onRestored };
}

beforeEach(() => {
  mocks.isMobile = false;
  useNotesUiStore.setState({ aiReview: null, isSidePanelOpen: true });
});

afterEach(() => {
  mocks.restore.mockReset();
});

describe('thẻ thay đổi trang bởi AI', () => {
  it('nên chỉ có tiêu đề và hai nút, không render diff trong chat', () => {
    const { container } = renderCard();

    expect(screen.getByText('Đã sửa trang Kế hoạch quý')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(container.querySelector('del, ins')).not.toBeInTheDocument();
  });

  it('nên mở chế độ so sánh trong khung tài liệu rồi đóng khi bấm lại', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    expect(useNotesUiStore.getState().aiReview).toEqual({ pageId: 'page-1', versionId: 'version-ai' });
    expect(useNotesUiStore.getState().isSidePanelOpen).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Ẩn thay đổi' }));
    expect(useNotesUiStore.getState().aiReview).toBeNull();
    expect(screen.getByRole('button', { name: 'Xem thay đổi' })).toBeInTheDocument();
  });

  it('nên đóng panel trên mobile để khung tài liệu hiện ra', async () => {
    mocks.isMobile = true;
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    expect(useNotesUiStore.getState().isSidePanelOpen).toBe(false);
  });

  it('nên khôi phục version, đóng so sánh và ẩn thẻ khi hoàn tác thành công', async () => {
    mocks.restore.mockResolvedValue({ pageId: 'page-1', previousVersionId: null });
    useNotesUiStore.setState({ aiReview: { pageId: 'page-1', versionId: 'version-ai' } });
    const onRestored = vi.fn();
    const user = userEvent.setup();
    renderCard(onRestored);

    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));

    await waitFor(() => expect(onRestored).toHaveBeenCalledOnce());
    expect(mocks.restore).toHaveBeenCalledWith('version-ai');
    expect(useNotesUiStore.getState().aiReview).toBeNull();
  });
});
