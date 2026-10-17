import { compareSemver, isNewerVersion } from '@/lib/version/semver';
import type { DesktopPlatform, UpdateManifest } from '@/lib/version/update-manifest';

type DesktopUpdateInfo = {
  version: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
};

export type AppUpdateState =
  | { kind: 'none' }
  | { kind: 'web-available'; version: string }
  | ({ kind: 'desktop-available' } & DesktopUpdateInfo)
  | ({ kind: 'desktop-required' } & DesktopUpdateInfo);

export type UpdateContext = {
  currentVersion: string;
  /** null = đang chạy trên trình duyệt. */
  platform: DesktopPlatform | null;
};

export const NO_UPDATE: AppUpdateState = { kind: 'none' };

/**
 * Chỉ báo khi PHIÊN BẢN (semver) tăng — build mới cùng version không làm phiền user.
 * Desktop thấp hơn minSupportedVersion → bắt buộc cập nhật (vd: contract BE đã đổi).
 */
export function resolveUpdateState(manifest: UpdateManifest, ctx: UpdateContext): AppUpdateState {
  if (ctx.platform === null) {
    return isNewerVersion(manifest.version, ctx.currentVersion)
      ? { kind: 'web-available', version: manifest.version }
      : NO_UPDATE;
  }

  const desktop = manifest.desktop;
  if (!desktop) return NO_UPDATE;

  const info: DesktopUpdateInfo = {
    version: desktop.latestVersion,
    downloadUrl: desktop.downloads[ctx.platform] ?? null,
    releaseNotes: desktop.releaseNotes,
  };

  const minVersion = desktop.minSupportedVersion;
  if (minVersion && compareSemver(ctx.currentVersion, minVersion) < 0) {
    return { kind: 'desktop-required', ...info };
  }
  // Không có bộ cài cho OS này thì nhắc cũng vô ích.
  if (info.downloadUrl && isNewerVersion(desktop.latestVersion, ctx.currentVersion)) {
    return { kind: 'desktop-available', ...info };
  }
  return NO_UPDATE;
}
