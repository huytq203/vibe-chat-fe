import {
  desktopReleaseSchema,
  type DesktopPlatform,
  type DesktopRelease,
} from '@/lib/version/update-manifest';

const DOWNLOAD_ENV: Record<DesktopPlatform, string> = {
  win32: 'DESKTOP_DOWNLOAD_URL_WIN32',
  linux: 'DESKTOP_DOWNLOAD_URL_LINUX',
  darwin: 'DESKTOP_DOWNLOAD_URL_DARWIN',
};

/** Chỉ giữ nền tảng đã có link — key rỗng nghĩa là "chưa có bộ cài", không phải lỗi. */
function readDownloads(): Partial<Record<DesktopPlatform, string>> {
  const entries = Object.entries(DOWNLOAD_ENV)
    .map(([platform, key]) => [platform, process.env[key]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  return Object.fromEntries(entries);
}

/**
 * Thông tin bản desktop mới nhất — cấu hình bằng env server của bản web, đổi khi
 * upload bộ cài mới (không cần build lại web). Thiếu DESKTOP_LATEST_VERSION → không
 * quảng bá bản desktop nào. Cấu hình sai → bỏ qua chứ không làm hỏng /version.json.
 */
export function readDesktopRelease(): DesktopRelease | null {
  const latestVersion = process.env.DESKTOP_LATEST_VERSION;
  if (!latestVersion) return null;

  const parsed = desktopReleaseSchema.safeParse({
    latestVersion,
    minSupportedVersion: process.env.DESKTOP_MIN_VERSION || null,
    releaseNotes: process.env.DESKTOP_RELEASE_NOTES || null,
    downloads: readDownloads(),
  });
  if (parsed.success) return parsed.data;

  console.error('[version.json] Cấu hình DESKTOP_* không hợp lệ', parsed.error.flatten().fieldErrors);
  return null;
}
