import { describe, expect, it } from 'vitest';
import { extractTiptapOutline } from './heading-outline';

describe('extractTiptapOutline', () => {
  it('nên lấy đúng sáu cấp khi level nằm trong attrs', () => {
    const content = Array.from({ length: 6 }, (_, index) => ({
      type: 'heading',
      attrs: { level: index + 1 },
      content: [{ type: 'text', text: `Cấp ${index + 1}` }],
    }));

    expect(extractTiptapOutline({ type: 'doc', content })).toEqual(
      content.map((_, index) => ({
        id: `heading-${index}`,
        level: index + 1,
        text: `Cấp ${index + 1}`,
      })),
    );
  });

  it('nên bỏ heading rỗng nhưng giữ chỉ số theo toàn bộ heading', () => {
    expect(extractTiptapOutline({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '  ' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Hiện' }] },
      ],
    })).toEqual([{ id: 'heading-2', level: 3, text: 'Hiện' }]);
  });

  it('nên giữ thứ tự tài liệu khi heading nằm trong nội dung lồng', () => {
    expect(extractTiptapOutline({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Trước' }] },
        {
          type: 'table',
          content: [{
            type: 'tableRow',
            content: [{
              type: 'tableCell',
              content: [{
                type: 'heading',
                attrs: { level: 4 },
                content: [{ type: 'text', text: 'Trong bảng' }],
              }],
            }],
          }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            { type: 'text', text: 'Liên ' },
            { type: 'link', content: [{ type: 'text', text: 'kết' }] },
          ],
        },
      ],
    })).toEqual([
      { id: 'heading-0', level: 1, text: 'Trước' },
      { id: 'heading-1', level: 4, text: 'Trong bảng' },
      { id: 'heading-2', level: 2, text: 'Liên kết' },
    ]);
  });
});
