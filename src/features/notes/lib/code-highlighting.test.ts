import { describe, expect, it } from 'vitest';

import { detectCodeLanguage, resolveCodeLanguage } from './code-highlighting';

describe('code highlighting', () => {
  it('chuẩn hoá alias ngôn ngữ dùng trong HTML public', () => {
    expect(resolveCodeLanguage('TS')).toBe('typescript');
    expect(resolveCodeLanguage('py')).toBe('python');
    expect(resolveCodeLanguage('yml')).toBe('yaml');
  });

  it('dùng text khi ngôn ngữ không được hỗ trợ', () => {
    expect(resolveCodeLanguage('unknown-language')).toBe('text');
  });

  it('nhận diện JavaScript cũ chưa lưu metadata ngôn ngữ', () => {
    expect(detectCodeLanguage('funtion haloCat(){\nconsole.log("hellohuy")\n}'))
      .toBe('javascript');
  });

  it('nhận diện một số cú pháp phổ biến mà không ép mọi nội dung thành code', () => {
    expect(detectCodeLanguage('def hello():\n  print("hello")')).toBe('python');
    expect(detectCodeLanguage('{"enabled": true}')).toBe('json');
    expect(detectCodeLanguage('Ghi chú bình thường')).toBe('text');
  });
});
