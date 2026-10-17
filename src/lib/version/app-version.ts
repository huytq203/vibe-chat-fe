/**
 * Phiên bản của chính bản build đang chạy. Nguồn duy nhất là `version` trong
 * package.json — next.config.ts inline vào NEXT_PUBLIC_APP_VERSION lúc build.
 * BUILD_ID chỉ để bust cache service worker, KHÔNG dùng để báo "có bản mới".
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
