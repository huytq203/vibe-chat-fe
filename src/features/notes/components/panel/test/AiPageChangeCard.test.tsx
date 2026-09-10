import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiPageChangeCard } from '@/features/notes/components/panel/AiPageChangeCard';
import type { PageVersion } from '@/features/notes/types';

const apiMocks = vi.hoisted(() => ({
  detail: vi.fn(),
  markdown: vi.fn(),
  restore: vi.fn(),
}));

vi.mock('@/services/notion.api', () => ({
  versionsApi: { detail: apiMocks.detail, restore: apiMocks.restore },
}));
vi.mock('@/services/notion-export.api', () => ({
  exportApi: { markdown: apiMocks.markdown },
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

afterEach(() => {
  apiMocks.detail.mockReset();
  apiMocks.markdown.mockReset();
  apiMocks.restore.mockReset();
});

describe('thẻ thay đổi trang bởi AI', () => {
  it('nên hiện diff theo từ và thu gọn khi bấm lại', async () => {
    apiMocks.detail.mockResolvedValue({ markdown: 'Xin chào bạn', title: 'Kế hoạch quý' });
    apiMocks.markdown.mockResolvedValue('Xin chào cả nhà');
    const user = userEvent.setup();
    const { container } = renderCard();

    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    await waitFor(() => expect(container.querySelector('del')).toHaveTextContent('bạn'));
    expect(container.querySelector('ins')).toHaveTextContent('cả nhà');
    await user.click(screen.getByRole('button', { name: 'Ẩn thay đổi' }));
    expect(container.querySelector('del')).not.toBeInTheDocument();
  });

  it('nên hiện loading khi đang tải hai bản markdown', async () => {
    apiMocks.detail.mockReturnValue(new Promise(() => undefined));
    apiMocks.markdown.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    expect(screen.getByLabelText('Đang tải thay đổi')).toBeInTheDocument();
  });

  it('nên hiện thay đổi tiêu đề khi chỉ đổi tiêu đề', async () => {
    apiMocks.detail.mockResolvedValue({
      markdown: 'Nội dung giữ nguyên',
      title: 'Kế hoạch tháng',
    });
    apiMocks.markdown.mockResolvedValue('Nội dung giữ nguyên');
    const user = userEvent.setup();
    const { container } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    await waitFor(() => expect(container.querySelector('del')).toHaveTextContent('Kế hoạch tháng'));
    expect(container.querySelector('ins')).toHaveTextContent('Kế hoạch quý');
    expect(screen.queryByText('Không có thay đổi nào')).not.toBeInTheDocument();
  });

  it('nên hiện cả tiêu đề và nội dung khi đổi cả hai', async () => {
    apiMocks.detail.mockResolvedValue({ markdown: 'Alpha', title: 'Tiêu đề cũ' });
    apiMocks.markdown.mockResolvedValue('Beta');
    const user = userEvent.setup();
    const { container } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    await waitFor(() => expect(container.querySelectorAll('del')).toHaveLength(2));
    const deleted = container.querySelectorAll('del');
    const inserted = container.querySelectorAll('ins');
    expect(inserted).toHaveLength(2);
    expect(deleted[0]).toHaveTextContent('Tiêu đề cũ');
    expect(inserted[0]).toHaveTextContent('Kế hoạch quý');
    expect(deleted[1]).toHaveTextContent('Alpha');
    expect(inserted[1]).toHaveTextContent('Beta');
  });

  it('nên hiện không có thay đổi nào khi cả tiêu đề và nội dung đều giữ nguyên', async () => {
    apiMocks.detail.mockResolvedValue({
      markdown: 'Nội dung giữ nguyên',
      title: 'Kế hoạch quý',
    });
    apiMocks.markdown.mockResolvedValue('Nội dung giữ nguyên');
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));

    expect(await screen.findByText('Không có thay đổi nào')).toBeInTheDocument();
  });

  it('nên cho thử lại khi tải thay đổi thất bại', async () => {
    apiMocks.detail.mockRejectedValueOnce(new Error('Hỏng'))
      .mockResolvedValueOnce({ markdown: 'Nội dung cũ', title: 'Kế hoạch quý' });
    apiMocks.markdown.mockResolvedValue('Nội dung mới');
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Xem thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thay đổi');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('button', { name: 'Ẩn thay đổi' })).toBeInTheDocument();
    expect(apiMocks.detail).toHaveBeenCalledTimes(2);
  });

  it('nên khôi phục version và ẩn thẻ khi hoàn tác thành công', async () => {
    apiMocks.restore.mockResolvedValue({ pageId: 'page-1', previousVersionId: null });
    const onRestored = vi.fn();
    const user = userEvent.setup();
    renderCard(onRestored);

    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));

    await waitFor(() => expect(apiMocks.restore).toHaveBeenCalledWith('version-ai'));
    expect(onRestored).toHaveBeenCalledOnce();
  });
});
