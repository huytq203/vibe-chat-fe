import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiAttachments } from './useAiAttachments';

class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,FAKEBASE64`;
    setTimeout(() => this.onload?.(), 0);
  }
}

beforeEach(() => {
  vi.stubGlobal('FileReader', MockFileReader);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-id-123') });
});

function makeFile(name: string, type: string, size = 1024): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('useAiAttachments', () => {
  it('từ chối file có MIME type không hỗ trợ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('virus.exe', 'application/octet-stream')]);
    });
    expect(result.current.error).toMatch('Định dạng không hỗ trợ: virus.exe');
    expect(result.current.attachments).toHaveLength(0);
  });

  it('từ chối file vượt quá 5MB', async () => {
    const { result } = renderHook(() => useAiAttachments());
    const bigFile = makeFile('big.png', 'image/png', 6 * 1024 * 1024);
    await act(async () => {
      await result.current.addFiles([bigFile]);
    });
    expect(result.current.error).toMatch('big.png vượt quá 5 MB');
    expect(result.current.attachments).toHaveLength(0);
  });

  it('encode và thêm file hợp lệ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].name).toBe('photo.png');
    expect(result.current.attachments[0].base64Data).toBe('FAKEBASE64');
  });

  it('từ chối khi tổng số file vượt quá 3', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([
        makeFile('a.png', 'image/png'),
        makeFile('b.png', 'image/png'),
        makeFile('c.png', 'image/png'),
      ]);
    });
    await act(async () => {
      await result.current.addFiles([makeFile('d.png', 'image/png')]);
    });
    expect(result.current.error).toMatch('Tối đa 3 file');
    expect(result.current.attachments).toHaveLength(3);
  });

  it('removeAttachment xóa đúng file và revoke object URL', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    const id = result.current.attachments[0].id;
    act(() => { result.current.removeAttachment(id); });
    expect(result.current.attachments).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('clearAttachments xóa toàn bộ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    act(() => { result.current.clearAttachments(); });
    expect(result.current.attachments).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
