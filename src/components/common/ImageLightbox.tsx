'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

export type LightboxSlide = { src: string; alt?: string };

export type ImageLightboxProps = {
  open: boolean;
  slides: LightboxSlide[];
  /** Slide mở đầu. */
  index?: number;
  onClose: () => void;
};

/**
 * Wrapper quanh yet-another-react-lightbox — xem ảnh phóng to (click-to-zoom)
 * và vuốt qua lại giữa nhiều ảnh (album). Bọc lại để dễ thay thư viện (§7).
 */
export function ImageLightbox({ open, slides, index = 0, onClose }: ImageLightboxProps) {
  const single = slides.length <= 1;
  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={slides}
      index={index}
      plugins={[Zoom]}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      // 1 ảnh → ẩn nút chuyển slide; nhiều ảnh → giữ mặc định để vuốt/prev-next.
      render={single ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      zoom={{ maxZoomPixelRatio: 4, doubleTapDelay: 250 }}
      styles={{ root: { '--yarl__color_backdrop': 'rgba(0,0,0,0.85)' } }}
    />
  );
}
