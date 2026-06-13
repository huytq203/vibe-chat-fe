'use client';

import { useEffect } from 'react';
import { isElectron, setElectronBadge } from '@/lib/electron';
import { useUnreadCount } from './use-query';

/** Vẽ overlay badge tròn đỏ + số (nền trong suốt) cho taskbar Windows → data URL PNG. */
function renderBadgeIcon(count: number): string | null {
  if (typeof document === 'undefined' || count <= 0) return null;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const label = count > 9 ? '9+' : String(count);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#e04949';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${label.length > 1 ? 16 : 20}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2 + 1);
  return canvas.toDataURL('image/png');
}

/**
 * Đồng bộ số thông báo chưa đọc lên taskbar/dock của app desktop (Electron).
 * No-op trên web. macOS/Linux dùng số badge; Windows dùng overlay icon (iconDataUrl).
 */
export function useElectronBadge(): void {
  const { data } = useUnreadCount();
  const count = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!isElectron()) return;
    setElectronBadge(count, renderBadgeIcon(count));
  }, [count]);

  // Rời app → xoá badge.
  useEffect(
    () => () => {
      if (isElectron()) setElectronBadge(0, null);
    },
    [],
  );
}
