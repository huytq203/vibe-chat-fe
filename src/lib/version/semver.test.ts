import { describe, expect, it } from 'vitest';
import { compareSemver, isNewerVersion, isValidSemver, parseSemver } from './semver';

describe('semver', () => {
  it('parse được phiên bản có tiền tố v và hậu tố pre-release', () => {
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('0.2.0-beta.1')).toEqual([0, 2, 0]);
  });

  it('trả null khi chuỗi không đúng định dạng', () => {
    expect(parseSemver('1.2')).toBeNull();
    expect(isValidSemver('latest')).toBe(false);
  });

  it('so sánh theo số chứ không theo chuỗi', () => {
    expect(compareSemver('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('0.1.1', '0.2.0')).toBeLessThan(0);
  });

  it('chỉ coi là bản mới khi lớn hơn hẳn', () => {
    expect(isNewerVersion('0.2.1', '0.2.0')).toBe(true);
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false);
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false);
  });
});
