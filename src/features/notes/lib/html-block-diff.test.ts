import { describe, expect, it } from 'vitest';
import { diffHtmlBlocks } from '@/features/notes/lib/html-block-diff';

function markedBlocks(html: string, change: 'added' | 'removed') {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return Array.from(body.querySelectorAll(`[data-ai-diff="${change}"]`)).map((block) => block.tagName);
}

describe('diffHtmlBlocks', () => {
  it('không đánh dấu gì khi hai bản giống nhau', () => {
    const html = '<h2>Mục</h2><p>Nội dung</p>';

    const result = diffHtmlBlocks(html, html);

    expect(result).toMatchObject({ removedCount: 0, addedCount: 0 });
    expect(result.beforeHtml).not.toContain('data-ai-diff');
    expect(result.afterHtml).not.toContain('data-ai-diff');
  });

  it('chỉ đánh dấu đoạn mới ở bản sau khi AI thêm một đoạn', () => {
    const result = diffHtmlBlocks('<p>A</p>', '<p>A</p><p>B</p>');

    expect(result).toMatchObject({ removedCount: 0, addedCount: 1 });
    expect(markedBlocks(result.afterHtml, 'added')).toEqual(['P']);
    expect(result.afterHtml).toContain('<span class="ai-diff-sr">Đã thêm: </span>B');
  });

  it('chỉ đánh dấu heading ở bản trước khi AI xoá heading đó', () => {
    const result = diffHtmlBlocks('<h1>Tiêu đề</h1><p>A</p>', '<p>A</p>');

    expect(result).toMatchObject({ removedCount: 1, addedCount: 0 });
    expect(markedBlocks(result.beforeHtml, 'removed')).toEqual(['H1']);
  });

  it('coi đoạn bị sửa là một khối xoá và một khối thêm', () => {
    const result = diffHtmlBlocks('<p>A</p><p>Cũ</p>', '<p>A</p><p>Mới</p>');

    expect(result).toMatchObject({ removedCount: 1, addedCount: 1 });
  });

  it('coi việc chỉ đổi định dạng là thay đổi', () => {
    const result = diffHtmlBlocks('<p>Chữ</p>', '<p><strong>Chữ</strong></p>');

    expect(result).toMatchObject({ removedCount: 1, addedCount: 1 });
  });

  it('bỏ qua khác biệt khoảng trắng giữa các thẻ', () => {
    const result = diffHtmlBlocks('<p>A  B</p>', '<p>A B</p>');

    expect(result).toMatchObject({ removedCount: 0, addedCount: 0 });
  });

  it('đặt nhãn đọc màn hình bên cạnh bảng thay vì chèn vào trong bảng', () => {
    const result = diffHtmlBlocks('', '<table><tbody><tr><td>1</td></tr></tbody></table>');

    expect(result.afterHtml.startsWith('<span class="ai-diff-sr">Đã thêm: </span><table data-ai-diff="added">')).toBe(true);
  });

  it('trả kết quả rỗng khi cả hai bản đều rỗng', () => {
    expect(diffHtmlBlocks('', '')).toEqual({
      beforeHtml: '', afterHtml: '', removedCount: 0, addedCount: 0,
    });
  });

  it('không thực thi script có trong HTML', () => {
    const marker = { ran: false };
    Object.assign(window, { __aiDiffMarker: marker });

    diffHtmlBlocks('<p>A</p>', '<script>window.__aiDiffMarker.ran = true</script><p>A</p>');

    expect(marker.ran).toBe(false);
  });
});
