import type { NextConfig } from 'next';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUILD_TARGET=electron  → static export (output: 'export'), không cần rewrites.
 *                           Frontend gọi thẳng backend qua NEXT_PUBLIC_*_URL.
 * BUILD_TARGET unset      → server mode với rewrites proxy (web deployment / next dev).
 *                           Cần AUTH_URL và VIBE_URL ở server-side.
 */
const isElectron = process.env.BUILD_TARGET === 'electron';

// execFileSync mặc định chỉ đệm 1MB rồi ném ENOBUFS. Một diff lockfile là đủ vượt,
// và vì lỗi bị nuốt ở nhánh catch bên dưới, buildId sẽ âm thầm ngừng đổi giữa các bản
// build → service worker giữ cache cũ vĩnh viễn.
const GIT_MAX_BUFFER = 256 * 1024 * 1024;

function gitLines(args: readonly string[]): string[] {
  return execFileSync('git', [...args], { encoding: 'utf8', maxBuffer: GIT_MAX_BUFFER })
    .split('\n')
    .filter(Boolean);
}

function createLocalBuildId(): string {
  const hash = createHash('sha256');
  const inputs = ['src', 'public', 'next.config.ts', 'package.json', 'package-lock.json'];

  try {
    hash.update(execFileSync('git', ['rev-parse', 'HEAD'], { maxBuffer: GIT_MAX_BUFFER }));

    // Hash từng file đang khác HEAD thay vì gộp một diff khổng lồ vào bộ đệm process.
    const changed = [
      ...gitLines(['diff', '--name-only', 'HEAD', '--', ...inputs]),
      ...gitLines(['ls-files', '--others', '--exclude-standard', '--', ...inputs]),
    ].sort();

    for (const file of changed) {
      hash.update(file);
      const path = resolve(process.cwd(), file);
      // File đã xoá: chỉ đường dẫn cũng đủ làm ID đổi so với bản build trước.
      if (existsSync(path)) hash.update(readFileSync(path));
    }
  } catch {
    // Source archive không có .git: package metadata vẫn cho một ID ổn định.
    hash.update(readFileSync(resolve(process.cwd(), 'package.json')));
  }

  return `halo-${hash.digest('hex').slice(0, 20)}`;
}

const buildId =
  process.env.BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  createLocalBuildId();

const AUTH_URL = process.env.AUTH_URL;
const VIBE_URL = process.env.VIBE_URL;
// Task-service (modular monolith riêng). Proxy same-origin để tránh CORS.
// Fallback sang NEXT_PUBLIC_TASK_URL để rewrite vẫn hoạt động nếu chỉ set biến public.
const TASK_URL = process.env.TASK_URL || process.env.NEXT_PUBLIC_TASK_URL;
// notion-service (dịch vụ ghi chú riêng). Proxy same-origin để tránh CORS.
// Fallback sang NEXT_PUBLIC_NOTION_URL để rewrite vẫn hoạt động nếu chỉ set biến public.
const NOTION_URL = process.env.NOTION_URL || process.env.NEXT_PUBLIC_NOTION_URL;
// bot-service (Management API riêng, cùng envelope {success,data,error} với auth-service).
const BOT_URL = process.env.BOT_URL || process.env.NEXT_PUBLIC_BOT_URL;

if (!isElectron && (!AUTH_URL || !VIBE_URL)) {
  throw new Error('Missing AUTH_URL or VIBE_URL in env — BE deployed, must be set.');
}

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSP đang chạy **Report-Only**: browser chỉ log vi phạm vào console, không chặn gì.
 *
 * Trước khi đổi key sang `Content-Security-Policy` (enforce) phải:
 * 1. Chạy thử đủ luồng gọi điện, chia sẻ màn hình, push FCM, Giphy, mini-app của bot.
 * 2. Siết `wss:` về đúng host LiveKit — host này do BE cấp theo từng phòng nên không
 *    có trong env, không liệt kê tĩnh được.
 * 3. Xoá `'unsafe-inline'` của script-src nếu chuyển sang nonce qua middleware.
 */
function buildContentSecurityPolicy(): string {
  const connectOrigins = [
    ...new Set(
      [
        process.env.NEXT_PUBLIC_AUTH_URL,
        process.env.NEXT_PUBLIC_VIBE_URL,
        process.env.NEXT_PUBLIC_WS_URL,
        process.env.NEXT_PUBLIC_CALL_WS_URL,
        process.env.NEXT_PUBLIC_TASK_URL,
        process.env.NEXT_PUBLIC_TASK_WS_URL,
        process.env.NEXT_PUBLIC_NOTION_URL,
        process.env.NEXT_PUBLIC_NOTION_WS_URL,
        process.env.NEXT_PUBLIC_BOT_URL,
        AUTH_URL,
        VIBE_URL,
        TASK_URL,
        NOTION_URL,
        BOT_URL,
      ]
        .map(toOrigin)
        .filter((origin): origin is string => origin !== null),
    ),
  ];

  return [
    "default-src 'self'",
    // 'unsafe-inline': script bootstrap inline của Next. 'wasm-unsafe-eval': @livekit/track-processors.
    // gstatic: firebase-messaging-sw.js importScripts SDK compat.
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src 'self' blob: wss: https://www.gstatic.com https://api.giphy.com https://media.giphy.com ${connectOrigins.join(' ')}`,
    // Mini-app của bot chạy trong iframe, domain do bên thứ ba tự chọn.
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  generateBuildId: async () => buildId,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // Cho phép Next.js dev HMR hoạt động khi truy cập qua Cloudflare Quick Tunnel.
  allowedDevOrigins: ['*.trycloudflare.com'],
  productionBrowserSourceMaps: false,
  ...(isElectron && {
    output: 'standalone',
    images: { unoptimized: true },
  }),
  ...(!isElectron && {
    async rewrites() {
      const rules = [
        { source: '/api/v1/auth/:path*', destination: `${AUTH_URL}/api/v1/auth/:path*` },
        { source: '/api/v1/:path*', destination: `${VIBE_URL}/api/v1/:path*` },
        { source: '/api/docs/:path*', destination: `${VIBE_URL}/api/docs/:path*` },
      ];
      // Proxy task-service qua prefix riêng (tránh đụng /api/v1 của chat). Same-origin → không CORS.
      if (TASK_URL) {
        rules.unshift({ source: '/task-proxy/:path*', destination: `${TASK_URL}/:path*` });
      }
      // Proxy notion-service qua prefix riêng (tránh đụng /api/v1 của chat). Same-origin → không CORS.
      if (NOTION_URL) {
        rules.unshift({ source: '/notion-proxy/:path*', destination: `${NOTION_URL}/:path*` });
      }
      // bot-service: prefix riêng /api/v1/ai + /api/v1/bot(s) — phải đứng trước
      // catch-all /api/v1/:path*. AI chat cũng do bot-service phục vụ (giữ DEEPSEEK_API_KEY).
      if (BOT_URL) {
        rules.unshift(
          { source: '/api/v1/ai/:path*', destination: `${BOT_URL}/api/v1/ai/:path*` },
          { source: '/api/v1/bots/:path*', destination: `${BOT_URL}/api/v1/bots/:path*` },
          { source: '/api/v1/bot/:path*', destination: `${BOT_URL}/api/v1/bot/:path*` },
        );
      }
      return rules;
    },
  }),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Content-Security-Policy-Report-Only', value: buildContentSecurityPolicy() },
          // Cuộc gọi cần camera/mic/chia sẻ màn hình ở chính trang này; iframe mini-app thì không.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
        ],
      },
      {
        // SDK cho mini-app của bot, nhúng từ domain khác nên cần CORS.
        // Các path còn lại không mở cho mọi origin.
        source: '/halo-webapp.js',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;
