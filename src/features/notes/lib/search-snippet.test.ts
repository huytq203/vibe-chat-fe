import { describe, expect, it } from 'vitest';
import { searchSnippetSegments } from './search-snippet';

describe('tách đoạn in đậm trong snippet tìm kiếm', () => {
  it('không có từ khớp nào → một đoạn duy nhất, không in đậm', () => {
    expect(searchSnippetSegments('không có gì khớp cả')).toEqual([
      { text: 'không có gì khớp cả', highlighted: false },
    ]);
  });

  it('tách đúng đoạn giữa các thẻ <b>', () => {
    expect(searchSnippetSegments('trước <b>khớp</b> sau')).toEqual([
      { text: 'trước ', highlighted: false },
      { text: 'khớp', highlighted: true },
      { text: ' sau', highlighted: false },
    ]);
  });

  it('nhiều từ khớp rải rác', () => {
    expect(searchSnippetSegments('<b>một</b> hai <b>ba</b>')).toEqual([
      { text: 'một', highlighted: true },
      { text: ' hai ', highlighted: false },
      { text: 'ba', highlighted: true },
    ]);
  });

  it('nội dung trang chứa chuỗi giống thẻ HTML vẫn giữ nguyên dạng văn bản', () => {
    const snippet = 'giá < 5 và > 10, thẻ <div> giả trong nội dung <b>trang</b>';
    const segments = searchSnippetSegments(snippet);

    expect(segments.some((s) => s.text.includes('<div>'))).toBe(true);
    expect(segments.find((s) => s.highlighted)?.text).toBe('trang');
  });
});
