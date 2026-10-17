import { env } from '@/config/env';
import { getElectronPlatform, isElectron } from '@/lib/electron';
import { desktopPlatformSchema, type DesktopPlatform } from '@/lib/version/update-manifest';

export type UpdateTarget = {
  /** null → không kiểm tra (desktop chưa cấu hình URL, hoặc OS lạ). */
  manifestUrl: string | null;
  platform: DesktopPlatform | null;
};

/**
 * Web đọc `/version.json` cùng origin. App desktop chạy server Next cục bộ (127.0.0.1)
 * nên `/version.json` cục bộ luôn là bản đang cài — phải hỏi bản web đang deploy.
 */
export function resolveUpdateTarget(): UpdateTarget {
  if (!isElectron()) return { manifestUrl: '/version.json', platform: null };

  const parsed = desktopPlatformSchema.safeParse(getElectronPlatform());
  if (!parsed.success) return { manifestUrl: null, platform: null };
  return { manifestUrl: env.NEXT_PUBLIC_UPDATE_MANIFEST_URL ?? null, platform: parsed.data };
}
