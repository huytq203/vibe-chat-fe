import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileUpload } from './useFileUpload';

const attachmentsMock = vi.hoisted(() => ({
  presign: vi.fn(),
  putToStorage: vi.fn(),
}));

vi.mock('@/services/notion-attachments.api', () => ({ attachmentsApi: attachmentsMock }));

function fileOfSize(bytes: number, name = 'file.bin', type = 'application/octet-stream'): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

afterEach(() => vi.clearAllMocks());

describe('useFileUpload', () => {
  it('chặn tệp vượt 50MB, không gọi presign', async () => {
    const { result } = renderHook(() => useFileUpload('page-1'));
    const file = fileOfSize(51 * 1024 * 1024);

    await expect(result.current(file)).rejects.toThrow('Tệp vượt quá 50MB');
    expect(attachmentsMock.presign).not.toHaveBeenCalled();
  });

  it('xin presign, PUT thẳng storage rồi trả về attachment://<id>', async () => {
    attachmentsMock.presign.mockResolvedValue({ url: 'https://minio.local/upload-url', attachmentId: 'att-1' });
    attachmentsMock.putToStorage.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFileUpload('page-1'));
    const file = fileOfSize(1024, 'ảnh.png', 'image/png');

    const url = await result.current(file, 'block-1');

    expect(attachmentsMock.presign).toHaveBeenCalledWith({
      pageId: 'page-1', blockId: 'block-1', fileName: 'ảnh.png', mimeType: 'image/png', size: 1024,
    });
    expect(attachmentsMock.putToStorage).toHaveBeenCalledWith(
      'https://minio.local/upload-url', file, 'image/png',
    );
    expect(url).toBe('attachment://att-1');
  });

  it('tệp không có type → dùng application/octet-stream', async () => {
    attachmentsMock.presign.mockResolvedValue({ url: 'https://minio.local/x', attachmentId: 'att-2' });
    attachmentsMock.putToStorage.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFileUpload('page-1'));
    const file = fileOfSize(1024, 'noext', '');

    await result.current(file);

    expect(attachmentsMock.presign).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'application/octet-stream' }),
    );
  });
});
