import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiphyItem } from '@/features/chat/types/gif';
import { useSendGif } from './use-giphy';

const fetchAsset = vi.fn();
const uploadDirect = vi.fn();
const sendMessage = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/giphy.api', async () => {
  const actual = await vi.importActual<typeof import('@/services/giphy.api')>(
    '@/services/giphy.api',
  );
  return {
    ...actual,
    giphyApi: { list: vi.fn(), fetchAsset: (id: string) => fetchAsset(id) },
  };
});

vi.mock('@/services/media.api', () => ({
  mediaApi: { uploadDirect: (...args: unknown[]) => uploadDirect(...args) },
}));

vi.mock('./use-mutations', () => ({
  useSendMessage: () => ({ mutateAsync: sendMessage }),
}));

vi.mock('sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

const media = {
  id: 'media-1',
  originalName: 'giphy-abc123.gif',
  size: 1024,
  mimeType: 'image/gif',
  width: 200,
  height: 160,
  duration: null,
  downloadUrl: 'https://s3.test/signed.gif',
};

const gif: GiphyItem = {
  id: 'abc123',
  title: 'mèo nhảy',
  previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
  previewWidth: 100,
  previewHeight: 80,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSendGif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAsset.mockResolvedValue(new Blob(['bytes'], { type: 'image/gif' }));
    uploadDirect.mockResolvedValue(media);
    sendMessage.mockResolvedValue('msg-1');
  });

  it('tải asset, upload ATTACHMENT rồi gửi tin IMAGE kèm attachmentIds', async () => {
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    expect(fetchAsset).toHaveBeenCalledWith('abc123');
    const [file, category] = uploadDirect.mock.calls[0] ?? [];
    expect(category).toBe('ATTACHMENT');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('giphy-abc123.gif');
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        type: 'IMAGE',
        attachmentIds: ['media-1'],
      }),
    );
  });

  it('không gửi tin khi tải asset thất bại và báo lỗi cho người dùng', async () => {
    fetchAsset.mockRejectedValue(new Error('mạng lỗi'));
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(uploadDirect).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('từ chối blob vượt 8MB trước khi upload', async () => {
    fetchAsset.mockResolvedValue(new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]));
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('GIF này quá lớn để gửi.'));
    expect(uploadDirect).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('không gửi tin khi upload thất bại', async () => {
    uploadDirect.mockRejectedValue(new Error('upload hỏng'));
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
