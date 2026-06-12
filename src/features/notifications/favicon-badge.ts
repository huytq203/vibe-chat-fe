/**
 * Vẽ chấm đỏ + số thông báo chưa đọc lên favicon (tab trình duyệt) và prefix
 * "(N) " vào document.title. Count = 0 → trả về favicon/title gốc.
 */

const ICON_SRC = '/icon-192.png';
const DEFAULT_FAVICON = '/favicon.ico';
const CANVAS_SIZE = 64;
const TITLE_PREFIX_RE = /^\(\d+\+?\)\s/;

let iconImage: HTMLImageElement | null = null;

function loadIcon(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (iconImage?.complete && iconImage.naturalWidth > 0) return resolve(iconImage);
    const img = new Image();
    img.src = ICON_SRC;
    img.onload = () => {
      iconImage = img;
      resolve(img);
    };
    img.onerror = reject;
  });
}

function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

/** Cập nhật favicon: count > 0 → icon kèm badge đỏ; count = 0 → favicon gốc. */
export async function applyFaviconBadge(count: number): Promise<void> {
  if (typeof document === 'undefined') return;
  const link = getFaviconLink();
  if (count <= 0) {
    link.href = DEFAULT_FAVICON;
    return;
  }

  const img = await loadIcon().catch(() => null);
  if (!img) return;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Badge đỏ góc trên-phải.
  const label = count > 9 ? '9+' : String(count);
  const r = 22;
  const cx = CANVAS_SIZE - r - 1;
  const cy = r + 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#e04949';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = ` ${label.length > 1 ? 33 : 35}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);

  link.href = canvas.toDataURL('image/png');
}

/** Prefix "(N) " vào title; count = 0 → gỡ prefix. Idempotent. */
export function applyTitleBadge(count: number): void {
  if (typeof document === 'undefined') return;
  const base = document.title.replace(TITLE_PREFIX_RE, '');
  const label = count > 99 ? '99+' : String(count);
  const next = count > 0 ? `(${label}) ${base}` : base;
  if (document.title !== next) document.title = next;
}
