import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit/memory';
import { GIPHY_API_BASE, readGiphyEnv } from './giphy-env';

export const runtime = 'nodejs';

const PAGE_SIZE = 24;
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const UPSTREAM_TIMEOUT_MS = 8_000;

const querySchema = z
  .object({
    kind: z.enum(['trending', 'search']),
    q: z.string().trim().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(4990).default(0),
  })
  .refine((value) => value.kind !== 'search' || value.q !== undefined, {
    message: 'q bắt buộc khi kind=search',
    path: ['q'],
  });

const upstreamSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().default(''),
      images: z.object({
        fixed_width_small: z.object({
          url: z.string().url(),
          webp: z.string().url().optional(),
          width: z.coerce.number().int().positive(),
          height: z.coerce.number().int().positive(),
        }),
      }),
    }),
  ),
  pagination: z.object({
    total_count: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
  }),
});

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function buildUpstreamUrl(
  apiKey: string,
  kind: 'trending' | 'search',
  query: string | undefined,
  offset: number,
): URL {
  const url = new URL(`${GIPHY_API_BASE}/${kind}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('rating', 'g');
  url.searchParams.set('bundle', 'messaging_non_clips');
  if (kind === 'search') {
    url.searchParams.set('q', query ?? '');
    url.searchParams.set('lang', 'vi');
  }
  return url;
}

export async function GET(request: Request): Promise<Response> {
  const limited = checkRateLimit({ key: `giphy:list:${getClientIp(request)}`, ...RATE_LIMIT });
  if (!limited.ok) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Bạn thao tác hơi nhanh, thử lại sau giây lát.' } },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  }

  const env = readGiphyEnv();
  if (!env) return fail(503, 'GIPHY_NOT_CONFIGURED', 'Tính năng GIF chưa được cấu hình.');
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    kind: params.get('kind') ?? 'trending',
    q: params.get('q') ?? undefined,
    offset: params.get('offset') ?? 0,
  });
  if (!parsed.success) return fail(400, 'INVALID_QUERY', 'Tham số tìm kiếm không hợp lệ.');

  const { kind, q, offset } = parsed.data;
  let payload: unknown;
  try {
    const response = await fetch(buildUpstreamUrl(env.GIPHY_API_KEY, kind, q, offset), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Giphy trả về lỗi.');
    payload = await response.json();
  } catch {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Không kết nối được tới Giphy.');
  }

  const upstream = upstreamSchema.safeParse(payload);
  if (!upstream.success) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Giphy trả về dữ liệu lạ.');
  const { data, pagination } = upstream.data;
  const items = data.map((gif) => ({
    id: gif.id,
    title: gif.title,
    previewUrl: gif.images.fixed_width_small.webp ?? gif.images.fixed_width_small.url,
    previewWidth: gif.images.fixed_width_small.width,
    previewHeight: gif.images.fixed_width_small.height,
  }));
  const consumed = pagination.offset + pagination.count;
  const nextOffset = items.length > 0 && consumed < pagination.total_count ? consumed : null;

  return Response.json(
    { items, nextOffset },
    { headers: { 'Cache-Control': `public, max-age=${kind === 'trending' ? 300 : 60}` } },
  );
}
