import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAttachments } from './useAttachments';

const mediaApi = vi.hoisted(() => ({
  uploadDirect: vi.fn(),
  presign: vi.fn(),
  putToStorage: vi.fn(),
  confirm: vi.fn(),
  remove: vi.fn(),
}));
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/services/media.api', () => ({ mediaApi }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

class MockImage {
  naturalWidth = 256;
  naturalHeight = 128;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('useAttachments — sticker mode', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:sticker-preview'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'attachment-1') });
    mediaApi.presign.mockResolvedValue({
      id: 'media-1',
      uploadUrl: 'https://storage.test/upload',
      contentType: 'image/webp',
    });
    mediaApi.putToStorage.mockResolvedValue(null);
    mediaApi.confirm.mockResolvedValue({
      id: 'media-1',
      category: 'STICKER',
      status: 'READY',
      mimeType: 'image/webp',
      size: 1024,
      originalName: 'cat.webp',
      width: 256,
      height: 128,
      duration: null,
      downloadUrl: 'https://storage.test/cat.webp',
      createdAt: '2026-08-11T00:00:00.000Z',
    });
    mediaApi.uploadDirect.mockResolvedValue({
      id: 'media-1',
      category: 'STICKER',
      status: 'READY',
      mimeType: 'image/webp',
      size: 1024,
      originalName: 'cat.webp',
      width: 256,
      height: 128,
      duration: null,
      downloadUrl: 'https://storage.test/cat.webp',
      createdAt: '2026-08-11T00:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('nhận ảnh PNG để server tự chuyển sang chuẩn sticker', async () => {
    const { result } = renderHook(() => useAttachments({ stickerMode: true }));

    act(() => result.current.addFiles([makeFile('photo.png', 'image/png')], 'image'));
    await act(async () => {
      await result.current.uploadAll();
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(mediaApi.uploadDirect).toHaveBeenCalledWith(
      expect.any(File),
      'STICKER',
      expect.any(Function),
    );
  });

  it('từ chối file không phải ảnh', () => {
    const { result } = renderHook(() => useAttachments({ stickerMode: true }));

    act(() => result.current.addFiles([makeFile('tailieu.pdf', 'application/pdf')]));

    expect(result.current.attachments).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith('Sticker phải là một file ảnh.');
  });

  it('từ chối ảnh lớn hơn 10MB', () => {
    const { result } = renderHook(() => useAttachments({ stickerMode: true }));

    act(() =>
      result.current.addFiles(
        [makeFile('to.png', 'image/png', 11 * 1024 * 1024)],
        'image',
      ),
    );

    expect(result.current.attachments).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith('Ảnh sticker phải nhỏ hơn 10MB.');
  });

  it('upload WebP bằng category STICKER và không gửi kích thước', async () => {
    const { result } = renderHook(() => useAttachments({ stickerMode: true }));

    act(() => result.current.addFiles([makeFile('cat.webp', 'image/webp')], 'image'));
    await act(async () => {
      await result.current.uploadAll();
    });

    expect(mediaApi.uploadDirect).toHaveBeenCalledWith(
      expect.any(File),
      'STICKER',
      expect.any(Function),
    );
    expect(mediaApi.presign).not.toHaveBeenCalled();
    expect(mediaApi.confirm).not.toHaveBeenCalled();
    expect(result.current.attachments[0]).toMatchObject({
      status: 'done',
      media: { id: 'media-1', category: 'STICKER' },
    });
  });
});
