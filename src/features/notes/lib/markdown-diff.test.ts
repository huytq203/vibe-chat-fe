import { describe, expect, it } from 'vitest';
import { createMarkdownDiff } from '@/features/notes/lib/markdown-diff';

describe('createMarkdownDiff', () => {
  it('nên tách đoạn theo từ khi nội dung thay đổi', () => {
    expect(createMarkdownDiff('Halo chào bạn', 'Halo chào cả nhà')).toEqual([
      { type: 'same', value: 'Halo chào ' },
      { type: 'removed', value: 'bạn' },
      { type: 'added', value: 'cả nhà' },
    ]);
  });

  it('nên chỉ trả về đoạn giống nhau khi hai bản trùng khớp', () => {
    expect(createMarkdownDiff('# Tiêu đề', '# Tiêu đề')).toEqual([
      { type: 'same', value: '# Tiêu đề' },
    ]);
  });

  it('nên thay cả từ thay vì tách theo ký tự khi từ gần giống nhau', () => {
    expect(createMarkdownDiff('mèo', 'mẹo')).toEqual([
      { type: 'removed', value: 'mèo' },
      { type: 'added', value: 'mẹo' },
    ]);
  });
});
