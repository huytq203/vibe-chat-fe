/**
 * So sánh phiên bản dạng `MAJOR.MINOR.PATCH` (semver rút gọn, bỏ qua pre-release/build).
 * Đủ cho quy ước phát hành của Halo — không kéo thêm thư viện `semver` vào bundle client.
 */

export const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

type SemverParts = readonly [number, number, number];

export function parseSemver(value: string): SemverParts | null {
  const match = SEMVER_PATTERN.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isValidSemver(value: string): boolean {
  return parseSemver(value) !== null;
}

/** Trả số âm nếu `a < b`, 0 nếu bằng, dương nếu `a > b`. Chuỗi sai định dạng coi như 0.0.0. */
export function compareSemver(a: string, b: string): number {
  const left = parseSemver(a) ?? [0, 0, 0];
  const right = parseSemver(b) ?? [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    const diff = left[i] - right[i];
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareSemver(candidate, current) > 0;
}
