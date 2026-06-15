import { describe, expect, it } from 'vitest';
import { jsonToMessage, messageToJson } from './serializer';

describe('serializer round-trip', () => {
  it('text đậm + mention (@ trong plaintext) + align', () => {
    const json = messageToJson(
      'Xin chao @Huy',
      [{ userId: 'u1', startOffset: 9, length: 4 }],
      { v: 1, marks: [{ start: 0, end: 3, type: 'bold' }], blocks: [{ start: 0, end: 13, align: 'center' }] },
    );
    const out = jsonToMessage(json);
    expect(out.plaintext).toBe('Xin chao @Huy');
    expect(out.mentions).toEqual([{ userId: 'u1', startOffset: 9, length: 4 }]);
    expect(out.richText?.marks).toEqual(expect.arrayContaining([{ start: 0, end: 3, type: 'bold' }]));
    expect(out.richText?.blocks[0]?.align).toBe('center');
  });

  it('link round-trip', () => {
    const json = messageToJson('see link', [], {
      v: 1, marks: [{ start: 4, end: 8, type: 'link', value: 'https://a.com' }], blocks: [],
    });
    const out = jsonToMessage(json);
    expect(out.richText?.marks).toEqual(
      expect.arrayContaining([{ start: 4, end: 8, type: 'link', value: 'https://a.com' }]),
    );
  });

  it('color + font round-trip giữ preset key', () => {
    const json = messageToJson('abc', [], {
      v: 1,
      marks: [
        { start: 0, end: 3, type: 'color', value: 'danger' },
        { start: 0, end: 3, type: 'font', value: 'mono' },
      ],
      blocks: [],
    });
    const out = jsonToMessage(json);
    expect(out.richText?.marks).toEqual(
      expect.arrayContaining([
        { start: 0, end: 3, type: 'color', value: 'danger' },
        { start: 0, end: 3, type: 'font', value: 'mono' },
      ]),
    );
  });

  it('multiline giữ \\n và align theo dòng', () => {
    const json = messageToJson('line1\nline2', [], {
      v: 1, marks: [], blocks: [{ start: 6, end: 11, align: 'right' }],
    });
    const out = jsonToMessage(json);
    expect(out.plaintext).toBe('line1\nline2');
    expect(out.richText?.blocks).toEqual(expect.arrayContaining([{ start: 6, end: 11, align: 'right' }]));
  });

  it('text thuần → richText null', () => {
    const json = messageToJson('hello', [], { v: 1, marks: [], blocks: [] });
    const out = jsonToMessage(json);
    expect(out.plaintext).toBe('hello');
    expect(out.richText).toBeNull();
  });
});
