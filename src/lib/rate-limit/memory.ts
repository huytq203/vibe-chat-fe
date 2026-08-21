/**
 * Rate-limit sliding window lưu trong RAM của tiến trình.
 *
 * Chỉ đúng khi app chạy một instance. Khi scale ngang, thay phần lưu trữ bằng
 * Redis và giữ nguyên chữ ký hàm để call-site không phải sửa.
 */

const hits = new Map<string, number[]>();
const SWEEP_THRESHOLD = 10_000;

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

function sweep(now: number, windowMs: number): void {
  for (const [key, times] of hits) {
    const last = times[times.length - 1];
    if (last === undefined || last <= now - windowMs) hits.delete(key);
  }
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  if (hits.size > SWEEP_THRESHOLD) sweep(now, windowMs);

  const from = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((time) => time > from);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(): void {
  hits.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
