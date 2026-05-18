import type { NextConfig } from 'next';

/**
 * 2 BE riêng:
 * - AUTH_URL  (default http://localhost:3001): chỉ phục vụ /api/v1/auth/*
 * - VIBE_URL  (default http://localhost:3000): conversations, messages, presence, ...
 *
 * Browser luôn gọi same-origin → KHÔNG cần CORS, cookie refresh_token tự gửi.
 * Thứ tự rewrite quan trọng: rule auth khớp TRƯỚC rule chung.
 */
const AUTH_URL = process.env.AUTH_URL;
const VIBE_URL = process.env.VIBE_URL;
if (!AUTH_URL || !VIBE_URL) {
  throw new Error('Missing AUTH_URL or VIBE_URL in env — BE deployed, must be set.');
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/v1/auth/:path*', destination: `${AUTH_URL}/api/v1/auth/:path*` },
      { source: '/api/v1/:path*', destination: `${VIBE_URL}/api/v1/:path*` },
      { source: '/api/docs/:path*', destination: `${VIBE_URL}/api/docs/:path*` },
    ];
  },
};

export default nextConfig;
