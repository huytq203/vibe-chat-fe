import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GiphyError } from '@/services/giphy.api';
import { GifPicker } from './GifPicker';

const useGiphyGifs = vi.fn();

vi.mock('@/features/chat/hooks/use-giphy', () => ({
  useGiphyGifs: (query: string) => useGiphyGifs(query),
}));

class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('IntersectionObserver', ObserverStub);

const gif = {
  id: 'abc123',
  title: 'mèo nhảy',
  previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
  previewWidth: 100,
  previewHeight: 80,
};

function mockState(state: Record<string, unknown>): void {
  useGiphyGifs.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...state,
  });
}

describe('GifPicker — 4 trạng thái', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loading: hiện skeleton', () => {
    mockState({ isPending: true });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByTestId('gif-skeleton')).toBeInTheDocument();
  });

  it('error: hiện thông báo kèm nút thử lại', async () => {
    const refetch = vi.fn();
    mockState({ isError: true, error: new Error('toang'), refetch });
    render(<GifPicker onPick={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(screen.getByText('Không tải được GIF')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('error GIPHY_NOT_CONFIGURED: không cho thử lại', () => {
    mockState({
      isError: true,
      error: new GiphyError('GIPHY_NOT_CONFIGURED', 'chưa cấu hình'),
    });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByText('Tính năng GIF chưa được cấu hình')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('empty: báo chưa có dữ liệu', () => {
    mockState({ data: { pages: [{ items: [], nextOffset: null }] } });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByText('Chưa có GIF nào')).toBeInTheDocument();
  });

  it('data: render lưới và gọi onPick', async () => {
    const onPick = vi.fn();
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    render(<GifPicker onPick={onPick} />);

    await userEvent.click(screen.getByRole('button', { name: 'mèo nhảy' }));

    expect(onPick).toHaveBeenCalledWith(gif);
  });

  it('khoá lưới khi đang gửi một GIF', () => {
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    render(<GifPicker onPick={vi.fn()} sendingId="abc123" />);

    expect(screen.getByRole('button', { name: 'mèo nhảy' })).toBeDisabled();
  });

  it('gõ tìm kiếm rồi truyền query đã debounce xuống hook', async () => {
    vi.useFakeTimers();
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    render(<GifPicker onPick={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm GIF' }), {
      target: { value: 'mèo' },
    });
    expect(useGiphyGifs).toHaveBeenLastCalledWith('');

    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(useGiphyGifs).toHaveBeenLastCalledWith('mèo');
    vi.useRealTimers();
  });
});
