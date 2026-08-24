'use client';

import { useAppViewport } from './useAppViewport';
import { useDisablePageZoom } from './useDisablePageZoom';

/** Mount một lần ở root layout: đồng bộ kích thước app với vùng nhìn thấy của iOS. */
export function ViewportSync(): null {
  useAppViewport();
  useDisablePageZoom();
  return null;
}
