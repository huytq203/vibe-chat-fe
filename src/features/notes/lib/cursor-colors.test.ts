import { describe, expect, it } from 'vitest';

import { themes } from '@/lib/theme/themes';

import { CURSOR_COLORS, cursorColorFor } from './cursor-colors';

describe('màu con trỏ cộng tác', () => {
  it('ổn định với cùng một userId', () => {
    expect(cursorColorFor('user-on-dinh')).toBe(cursorColorFor('user-on-dinh'));
  });

  it('thường cho hai userId khác nhau hai màu khác nhau', () => {
    expect(cursorColorFor('user-1')).not.toBe(cursorColorFor('user-2'));
  });

  it('chỉ trả màu trong đúng bảng thiết kế và không bao giờ trả cyan', () => {
    const selfCursorColor = themes.find((theme) => theme.name === 'indigo')?.colors.primary;
    expect(CURSOR_COLORS).toHaveLength(8);
    for (let index = 0; index < 1_000; index += 1) {
      const color = cursorColorFor(`user-${index}`);
      expect(CURSOR_COLORS).toContain(color);
      expect(color).not.toBe(selfCursorColor);
    }
  });
});
