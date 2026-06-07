import { describe, expect, it } from 'vitest';
import { formatDuration, mapCallErrorCode } from './utils';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(5)).toBe('0:05');
  });
  it('formats minutes and seconds', () => {
    expect(formatDuration(323)).toBe('5:23');
  });
  it('formats over an hour', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

describe('mapCallErrorCode', () => {
  it('maps known busy code to Vietnamese', () => {
    expect(mapCallErrorCode('CALL_CALLEE_BUSY')).toBe('Máy bận');
  });
  it('falls back to provided message for unknown code', () => {
    expect(mapCallErrorCode('SOMETHING_ELSE', 'fallback')).toBe('fallback');
  });
});
