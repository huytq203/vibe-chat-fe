import { z } from 'zod';
import { isValidSemver } from './semver';

const semverSchema = z.string().refine(isValidSemver, 'Phiên bản phải dạng MAJOR.MINOR.PATCH');

export const desktopPlatformSchema = z.enum(['win32', 'linux', 'darwin']);
export type DesktopPlatform = z.infer<typeof desktopPlatformSchema>;

export const desktopReleaseSchema = z.object({
  latestVersion: semverSchema,
  // App desktop thấp hơn mốc này bị chặn dùng tới khi cập nhật (vd: thay đổi contract BE).
  minSupportedVersion: semverSchema.nullable(),
  releaseNotes: z.string().nullable(),
  downloads: z.partialRecord(desktopPlatformSchema, z.string().url()),
});
export type DesktopRelease = z.infer<typeof desktopReleaseSchema>;

/** Nội dung `/version.json` do bản web đang deploy phục vụ — cả web lẫn desktop cùng đọc. */
export const updateManifestSchema = z.object({
  version: semverSchema,
  buildId: z.string(),
  desktop: desktopReleaseSchema.nullable(),
});
export type UpdateManifest = z.infer<typeof updateManifestSchema>;
