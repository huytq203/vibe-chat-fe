import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit/memory';
import { GIPHY_API_BASE, readGiphyEnv } from '../giphy-env';

export const runtime = 'nodejs';

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
const MAX_BYTES = 8 * 1024 * 1024;
const DETAIL_TIMEOUT_MS = 8_000;
const ASSET_TIMEOUT_MS = 15_000;

const querySchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
});

const detailSchema = z.object({
  data: z.object({
    images: z.object({
      downsized_medium: z.object({ url: z.string().url() }).optional(),
      downsized: z.object({ url: z.string().url() }).optional(),
      original: z.object({ url: z.string().url() }).optional(),
    }),
  }),
});

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isGiphyHost(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    return protocol === 'https:' && (hostname === 'giphy.com' || hostname.endsWith('.giphy.com'));
  } catch {
    return false;
  }
}

async function fetchDetail(url: URL): Promise<unknown | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function fetchAsset(source: string): Promise<Response | null> {
  try {
    return await fetch(source, { signal: AbortSignal.timeout(ASSET_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const parsed = querySchema.safeParse({ id: new URL(request.url).searchParams.get('id') ?? '' });
  if (!parsed.success) return fail(400, 'INVALID_QUERY', 'Mã GIF không hợp lệ.');
  const limited = checkRateLimit({ key: `giphy:asset:${getClientIp(request)}`, ...RATE_LIMIT });
  if (!limited.ok) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Bạn gửi GIF hơi nhanh, thử lại sau giây lát.' } },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  }

  const env = readGiphyEnv();
  if (!env) return fail(503, 'GIPHY_NOT_CONFIGURED', 'Tính năng GIF chưa được cấu hình.');
  const { id } = parsed.data;
  const detailUrl = new URL(`${GIPHY_API_BASE}/${id}`);
  detailUrl.searchParams.set('api_key', env.GIPHY_API_KEY);
  const detail = detailSchema.safeParse(await fetchDetail(detailUrl));
  if (!detail.success) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Không lấy được GIF từ Giphy.');

  const { images } = detail.data.data;
  const source = images.downsized_medium?.url ?? images.downsized?.url ?? images.original?.url;
  if (!source || !isGiphyHost(source)) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'GIF không khả dụng.');
  const asset = await fetchAsset(source);
  const contentType = asset?.headers.get('content-type') ?? '';
  if (!asset?.ok || !asset.body || !contentType.startsWith('image/')) {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'GIF không khả dụng.');
  }
  const contentLength = Number(asset.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BYTES) return fail(413, 'GIF_TOO_LARGE', 'GIF này quá lớn để gửi.');

  return new Response(asset.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Disposition': `inline; filename="giphy-${id}.gif"`,
    },
  });
}
