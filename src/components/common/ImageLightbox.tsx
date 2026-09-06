'use client';

import { useMemo } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';
import 'yet-another-react-lightbox/styles.css';

export type LightboxSlide = {
  src: string;
  alt?: string;
  /**
   * Có handler → hiện nút tải trên thanh công cụ. Caller tự lo việc tải vì URL
   * ký sẵn của S3 là cross-origin: thuộc tính `download` của thẻ <a> bị bỏ qua,
   * và URL còn có thể đã hết hạn nên cần ký lại trước khi tải.
   */
  onDownload?: () => void | Promise<void>;
};

export type ImageLightboxProps = {
  open: boolean;
  slides: LightboxSlide[];
  /** Slide mở đầu. */
  index?: number;
  onClose: () => void;
};

/**
 * Wrapper quanh yet-another-react-lightbox — xem ảnh phóng to (click-to-zoom),
 * vuốt qua lại giữa nhiều ảnh (album) và tải ảnh về máy. Bọc lại để dễ thay thư
 * viện (§7).
 */
export function ImageLightbox({ open, slides, index = 0, onClose }: ImageLightboxProps) {
  const single = slides.length <= 1;

  // Tra handler theo `src` vì callback của plugin chỉ trả về slide, không trả index.
  const handlers = useMemo(() => {
    const map = new Map<string, () => void | Promise<void>>();
    for (const slide of slides) {
      if (slide.onDownload) map.set(slide.src, slide.onDownload);
    }
    return map;
  }, [slides]);

  const canDownload = handlers.size > 0;

  // `download: true` là cờ bật nút cho từng slide của plugin; việc tải thật do
  // `download.download` bên dưới đảm nhiệm.
  const items = useMemo(
    () => slides.map((s) => ({ src: s.src, alt: s.alt, download: Boolean(s.onDownload) })),
    [slides],
  );

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={items}
      index={index}
      plugins={canDownload ? [Zoom, Download] : [Zoom]}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      // 1 ảnh → ẩn nút chuyển slide; nhiều ảnh → giữ mặc định để vuốt/prev-next.
      render={single ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      zoom={{ maxZoomPixelRatio: 4, doubleTapDelay: 250 }}
      labels={{ Download: 'Tải ảnh về máy' }}
      download={{
        download: ({ slide }) => {
          if (!('src' in slide) || typeof slide.src !== 'string') return;
          void handlers.get(slide.src)?.();
        },
      }}
      styles={{
        root: { '--yarl__color_backdrop': 'rgba(0,0,0,0.85)' },
        // App tràn viền trên iOS → thanh công cụ (nút đóng, zoom) phải lùi khỏi
        // Dynamic Island/notch, nếu không nút X nằm ngay dưới thanh trạng thái.
        toolbar: {
          paddingTop: 'calc(var(--safe-top) + 8px)',
          paddingRight: 'calc(var(--safe-right) + 8px)',
          paddingLeft: 'calc(var(--safe-left) + 8px)',
        },
      }}
    />
  );
}
