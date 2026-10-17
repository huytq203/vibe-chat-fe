import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiChangeReview } from '@/features/notes/components/review/AiChangeReview';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

const apiMocks = vi.hoisted(() => ({
  detail: vi.fn(),
  html: vi.fn(),
  restore: vi.fn(),
}));

vi.mock('@/services/notion.api', () => ({
  versionsApi: { detail: apiMocks.detail, restore: apiMocks.restore },
}));
vi.mock('@/services/notion-export.api', () => ({
  exportApi: { html: apiMocks.html },
}));

function renderReview(currentTitle = 'Kế hoạch quý') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AiChangeReview pageId="page-1" versionId="version-ai" currentTitle={currentTitle} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useNotesUiStore.setState({
    aiReview: { pageId: 'page-1', versionId: 'version-ai' },
    restoredAiVersionId: null,
  });
});

afterEach(() => {
  apiMocks.detail.mockReset();
  apiMocks.html.mockReset();
  apiMocks.restore.mockReset();
});

describe('chế độ xem thay đổi AI trong khung tài liệu', () => {
  it('nên hiện skeleton khi đang tải hai bản', () => {
    apiMocks.detail.mockReturnValue(new Promise(() => undefined));
    apiMocks.html.mockReturnValue(new Promise(() => undefined));

    renderReview();

    expect(screen.getByTestId('ai-review-loading')).toBeInTheDocument();
  });

  it('nên hiện bản trước ở trên, bản sau ở dưới và đếm khối đổi', async () => {
    apiMocks.detail.mockResolvedValue({ html: '<p>A</p><p>Cũ</p>', title: 'Nháp' });
    apiMocks.html.mockResolvedValue('<p>A</p><p>Mới</p><p>Thêm</p>');

    renderReview();

    const sections = await screen.findAllByRole('region');
    expect(sections.map((section) => section.getAttribute('aria-labelledby'))).toEqual([
      'ai-review-before-heading', 'ai-review-after-heading',
    ]);
    expect(screen.getAllByText('1 khối đã xoá').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 khối mới').length).toBeGreaterThan(0);
    expect(screen.getByText('Nháp')).toHaveClass('line-through');
    expect(screen.getByText('Kế hoạch quý')).toHaveClass('text-success');
    expect(screen.getByRole('button', { name: 'Bản sau' })).toBeInTheDocument();
  });

  it('nên báo không có thay đổi khi hai bản giống nhau', async () => {
    apiMocks.detail.mockResolvedValue({ html: '<p>A</p>', title: 'Kế hoạch quý' });
    apiMocks.html.mockResolvedValue('<p>A</p>');

    renderReview();

    expect(await screen.findByText('Không có thay đổi nào')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bản sau' })).not.toBeInTheDocument();
  });

  it('nên cho thử lại khi tải lỗi', async () => {
    apiMocks.detail.mockRejectedValue(new Error('boom'));
    apiMocks.html.mockResolvedValue('<p>A</p>');

    renderReview();

    expect(await screen.findByText('Không tải được thay đổi')).toBeInTheDocument();
  });

  it('nên đóng khi bấm nút đóng hoặc nhấn Esc', async () => {
    apiMocks.detail.mockResolvedValue({ html: '<p>A</p>', title: 'Kế hoạch quý' });
    apiMocks.html.mockResolvedValue('<p>B</p>');
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole('button', { name: 'Đóng xem thay đổi' }));
    expect(useNotesUiStore.getState().aiReview).toBeNull();

    useNotesUiStore.setState({ aiReview: { pageId: 'page-1', versionId: 'version-ai' } });
    await user.keyboard('{Escape}');
    expect(useNotesUiStore.getState().aiReview).toBeNull();
  });

  it('nên hoàn tác rồi đóng và ghi nhận version đã hoàn tác', async () => {
    apiMocks.detail.mockResolvedValue({ html: '<p>A</p>', title: 'Kế hoạch quý' });
    apiMocks.html.mockResolvedValue('<p>B</p>');
    apiMocks.restore.mockResolvedValue({ pageId: 'page-1', previousVersionId: null });
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));

    await waitFor(() => expect(useNotesUiStore.getState().aiReview).toBeNull());
    expect(apiMocks.restore).toHaveBeenCalledWith('version-ai');
    expect(useNotesUiStore.getState().restoredAiVersionId).toBe('version-ai');
  });
});
