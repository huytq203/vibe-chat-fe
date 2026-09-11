import { describe, expect, it } from 'vitest';
import { extractHeadingOutline, extractTiptapOutline } from './heading-outline';

describe('extractHeadingOutline', () => {
  it('extracts only headings from a flat document in document order', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'First heading' }],
      },
      {
        id: 'paragraph-1',
        type: 'paragraph',
        content: [{ type: 'text', text: 'Paragraph text' }],
      },
      {
        id: 'heading-2',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Second heading' }],
      },
    ];

    expect(extractHeadingOutline(blocks)).toEqual([
      { id: 'heading-1', level: 1, text: 'First heading' },
      { id: 'heading-2', level: 2, text: 'Second heading' },
    ]);
  });

  it('extracts nested headings in preorder document order', () => {
    const blocks = [
      {
        id: 'heading-parent',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Parent heading' }],
        children: [
          {
            id: 'paragraph-child',
            type: 'paragraph',
            content: [{ type: 'text', text: 'Nested paragraph' }],
            children: [
              {
                id: 'heading-nested',
                type: 'heading',
                props: { level: 3 },
                content: [{ type: 'text', text: 'Nested heading' }],
              },
            ],
          },
        ],
      },
      {
        id: 'heading-after',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Following heading' }],
      },
    ];

    expect(extractHeadingOutline(blocks)).toEqual([
      { id: 'heading-parent', level: 1, text: 'Parent heading' },
      { id: 'heading-nested', level: 3, text: 'Nested heading' },
      { id: 'heading-after', level: 2, text: 'Following heading' },
    ]);
  });

  it('omits headings whose text is empty after trimming', () => {
    const blocks = [
      { id: 'empty', type: 'heading', props: { level: 1 }, content: [] },
      {
        id: 'whitespace',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: '   \n  ' }],
      },
      {
        id: 'non-empty',
        type: 'heading',
        props: { level: 3 },
        content: [{ type: 'text', text: '  Visible heading  ' }],
      },
    ];

    expect(extractHeadingOutline(blocks)).toEqual([
      { id: 'non-empty', level: 3, text: 'Visible heading' },
    ]);
  });

  it('combines text nodes with nested link text', () => {
    const blocks = [
      {
        id: 'linked-heading',
        type: 'heading',
        props: { level: 2 },
        content: [
          { type: 'text', text: 'Read ' },
          {
            type: 'link',
            href: 'https://example.com',
            content: [{ type: 'text', text: 'the guide' }],
          },
          { type: 'text', text: ' today' },
        ],
      },
    ];

    expect(extractHeadingOutline(blocks)).toEqual([
      { id: 'linked-heading', level: 2, text: 'Read the guide today' },
    ]);
  });

  it('returns an empty array for empty or invalid input without throwing', () => {
    const invalidInput = undefined as unknown as readonly unknown[];

    expect(extractHeadingOutline([])).toEqual([]);
    expect(() => extractHeadingOutline(invalidInput)).not.toThrow();
    expect(extractHeadingOutline(invalidInput)).toEqual([]);
    expect(extractHeadingOutline([null, 42, 'heading'])).toEqual([]);
  });
});

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
