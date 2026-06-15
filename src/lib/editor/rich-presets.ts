/**
 * Whitelist preset cho rich text (màu/font) + sanitize URL link.
 * Giá trị color/font dùng CSS var theme (Design/DESIGN.md) — KHÔNG hex rời rạc.
 */

export type RichColor = { key: string; label: string; cssVar: string };

/** Màu chữ & highlight — bám token theme. `cssVar` map sang style runtime. */
export const RICH_COLORS: readonly RichColor[] = [
  { key: 'default', label: 'Mặc định', cssVar: 'var(--color-foreground)' },
  { key: 'primary', label: 'Tím', cssVar: 'var(--color-primary)' },
  { key: 'success', label: 'Xanh lá', cssVar: 'var(--color-success)' },
  { key: 'warning', label: 'Vàng', cssVar: 'var(--color-warning)' },
  { key: 'danger', label: 'Đỏ', cssVar: 'var(--color-danger)' },
  { key: 'muted', label: 'Xám', cssVar: 'var(--color-muted-foreground)' },
] as const;

export type RichFont = { key: string; label: string; cssFamily: string };

export const RICH_FONTS: readonly RichFont[] = [
  { key: 'default', label: 'Mặc định', cssFamily: 'inherit' },
  { key: 'serif', label: 'Serif', cssFamily: 'Georgia, "Times New Roman", serif' },
  { key: 'mono', label: 'Mono', cssFamily: 'ui-monospace, "SF Mono", monospace' },
] as const;

const COLOR_KEYS = new Set(RICH_COLORS.map((c) => c.key));
const FONT_KEYS = new Set(RICH_FONTS.map((f) => f.key));

export const isColorKey = (v: string): boolean => COLOR_KEYS.has(v);
export const isFontKey = (v: string): boolean => FONT_KEYS.has(v);

export const colorCssVar = (key: string): string =>
  RICH_COLORS.find((c) => c.key === key)?.cssVar ?? 'var(--color-foreground)';
export const fontCssFamily = (key: string): string =>
  RICH_FONTS.find((f) => f.key === key)?.cssFamily ?? 'inherit';

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

/**
 * Chuẩn hoá + kiểm tra URL link. Trả URL an toàn hoặc null nếu không hợp lệ /
 * scheme nguy hiểm (javascript:, data:, ...). URL không scheme → thêm https://.
 */
export function sanitizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return SAFE_SCHEMES.includes(url.protocol) ? candidate : null;
  } catch {
    return null;
  }
}
