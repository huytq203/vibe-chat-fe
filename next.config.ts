import type { NextConfig } from 'next';

/**
 * BUILD_TARGET=electron  → static export (output: 'export'), không cần rewrites.
 *                           Frontend gọi thẳng backend qua NEXT_PUBLIC_*_URL.
 * BUILD_TARGET unset      → server mode với rewrites proxy (web deployment / next dev).
 *                           Cần AUTH_URL và VIBE_URL ở server-side.
 */
const isElectron = process.env.BUILD_TARGET === 'electron';

const AUTH_URL = process.env.AUTH_URL;
const VIBE_URL = process.env.VIBE_URL;

if (!isElectron && (!AUTH_URL || !VIBE_URL)) {
  throw new Error('Missing AUTH_URL or VIBE_URL in env — BE deployed, must be set.');
}

const nextConfig: NextConfig = {
  ...(isElectron && {
    output: 'standalone',
    images: { unoptimized: true },
  }),
  ...(!isElectron && {
    async rewrites() {
      return [
        { source: '/api/v1/auth/:path*', destination: `${AUTH_URL}/api/v1/auth/:path*` },
        { source: '/api/v1/:path*', destination: `${VIBE_URL}/api/v1/:path*` },
        { source: '/api/docs/:path*', destination: `${VIBE_URL}/api/docs/:path*` },
      ];
    },
  }),
};

export default nextConfig;
