import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, getClientIp, resetRateLimit } from './memory';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('cho qua khi chưa chạm giới hạn', () => {
    const first = checkRateLimit({ key: 'ip-1', limit: 3, windowMs: 60_000, now: 1_000 });
    const second = checkRateLimit({ key: 'ip-1', limit: 3, windowMs: 60_000, now: 1_100 });

    expect(first).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(second.ok).toBe(true);
  });

  it('chặn request vượt giới hạn và trả thời gian chờ', () => {
    for (let index = 0; index < 3; index += 1) {
      checkRateLimit({ key: 'ip-2', limit: 3, windowMs: 60_000, now: 1_000 + index });
    }

    const blocked = checkRateLimit({ key: 'ip-2', limit: 3, windowMs: 60_000, now: 1_500 });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('cho qua lại sau khi cửa sổ trôi qua', () => {
    checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 1_000 });
    expect(checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 2_000 }).ok).toBe(false);
    expect(checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 62_000 }).ok).toBe(true);
  });

  it('đếm độc lập giữa các key', () => {
    checkRateLimit({ key: 'a', limit: 1, windowMs: 60_000, now: 1_000 });
    expect(checkRateLimit({ key: 'b', limit: 1, windowMs: 60_000, now: 1_000 }).ok).toBe(true);
  });
});

describe('getClientIp', () => {
  it('lấy IP đầu tiên trong x-forwarded-for', () => {
    const request = new Request('http://localhost/api/giphy', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('fallback sang x-real-ip rồi unknown', () => {
    const withReal = new Request('http://localhost/api/giphy', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });
    const bare = new Request('http://localhost/api/giphy');

    expect(getClientIp(withReal)).toBe('198.51.100.2');
    expect(getClientIp(bare)).toBe('unknown');
  });
});
