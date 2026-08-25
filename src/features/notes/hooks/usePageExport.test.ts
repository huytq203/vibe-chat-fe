import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePageExport } from './usePageExport';

const exportMock = vi.hoisted(() => ({
  markdown: vi.fn(),
  html: vi.fn(),
  pdf: vi.fn(),
}));
vi.mock('@/services/notion-export.api', () => ({ exportApi: exportMock }));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

let createObjectURLSpy: ReturnType<typeof vi.fn>;
let clickSpy: ReturnType<typeof vi.fn<() => void>>;

function stubDownload() {
  createObjectURLSpy = vi.fn(() => 'blob:page-export');
  vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: vi.fn() });
  clickSpy = vi.fn<() => void>();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('usePageExport', () => {
  it('xuất Markdown → tải blob text/markdown, tên tệp chuẩn hoá từ tiêu đề', async () => {
    stubDownload();
    exportMock.markdown.mockResolvedValue('# Xin chào');
    const { result } = renderHook(() => usePageExport('page-1', 'Kế hoạch Q3'));

    await act(() => result.current.exportPage('markdown'));

    expect(exportMock.markdown).toHaveBeenCalledWith('page-1');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('ke-hoach-q3.md');
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/markdown');
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('xuất HTML → gọi đúng endpoint, tải blob text/html', async () => {
    stubDownload();
    exportMock.html.mockResolvedValue('<p>hi</p>');
    const { result } = renderHook(() => usePageExport('page-1', 'Trang'));

    await act(() => result.current.exportPage('html'));

    expect(exportMock.html).toHaveBeenCalledWith('page-1');
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/html');
  });

  it('xuất PDF → tải thẳng Blob application/pdf mà exportApi.pdf trả về', async () => {
    stubDownload();
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    exportMock.pdf.mockResolvedValue(pdfBlob);
    const { result } = renderHook(() => usePageExport('page-1', 'Trang'));

    await act(() => result.current.exportPage('pdf'));

    expect(exportMock.pdf).toHaveBeenCalledWith('page-1');
    expect(createObjectURLSpy).toHaveBeenCalledWith(pdfBlob);
  });

  it('tiêu đề rỗng → dùng tên tệp mặc định', async () => {
    stubDownload();
    exportMock.markdown.mockResolvedValue('nội dung');
    const { result } = renderHook(() => usePageExport('page-1', '   '));

    await act(() => result.current.exportPage('markdown'));

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('khong-co-tieu-de.md');
  });

  it('lỗi (vd Gotenberg 503) → hiện đúng thông báo lỗi, không tải tệp', async () => {
    stubDownload();
    exportMock.pdf.mockRejectedValue(new Error('Không thể xuất PDF qua Gotenberg'));
    const { result } = renderHook(() => usePageExport('page-1', 'Trang'));

    await act(() => result.current.exportPage('pdf'));

    expect(toastMock.error).toHaveBeenCalledWith('Không thể xuất PDF qua Gotenberg');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('đang xuất một mục thì bỏ qua lệnh gọi export mới', async () => {
    stubDownload();
    let resolveMarkdown: (value: string) => void = () => undefined;
    exportMock.markdown.mockReturnValue(new Promise((resolve) => { resolveMarkdown = resolve; }));
    const { result } = renderHook(() => usePageExport('page-1', 'Trang'));

    let firstCall: Promise<void> = Promise.resolve();
    act(() => { firstCall = result.current.exportPage('markdown'); });
    await waitFor(() => expect(result.current.pending).toBe('markdown'));

    await act(() => result.current.exportPage('pdf'));
    expect(exportMock.pdf).not.toHaveBeenCalled();

    resolveMarkdown('xong');
    await act(() => firstCall);
    await waitFor(() => expect(result.current.pending).toBeNull());
  });
});
