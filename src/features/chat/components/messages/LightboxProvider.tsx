'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import type { LightboxSlide } from '@/components/common/ImageLightbox';

// Lazy-load lightbox + CSS — chỉ tải khi user mở ảnh lần đầu (§9).
const ImageLightbox = dynamic(
  () => import('@/components/common/ImageLightbox').then((m) => m.ImageLightbox),
  { ssr: false },
);

type RegisteredSlide = LightboxSlide & {
  /** id ảnh (= message.id) để mở đúng slide. */
  id: string;
  /** Khóa sắp xếp để album đúng thứ tự thời gian (= message.createdAt). */
  sortKey: string;
};

type LightboxContextValue = {
  register: (slide: RegisteredSlide) => void;
  unregister: (id: string) => void;
  open: (id: string) => void;
};

const noop = () => {};
const LightboxContext = createContext<LightboxContextValue>({
  register: noop,
  unregister: noop,
  open: noop,
});

/** Đăng ký ảnh vào album + mở lightbox tại ảnh đó. */
export function useImageLightbox() {
  return useContext(LightboxContext);
}

/**
 * Gom mọi ảnh đang hiển thị trong cuộc trò chuyện thành 1 album.
 * Mỗi ImageView tự register slide của nó; click ảnh → mở lightbox dùng chung,
 * vuốt/prev-next qua lại các ảnh khác.
 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const slides = useRef<Map<string, RegisteredSlide>>(new Map());
  const [isOpen, setIsOpen] = useState(false);
  const [ordered, setOrdered] = useState<LightboxSlide[]>([]);
  const [index, setIndex] = useState(0);

  const register = useCallback((slide: RegisteredSlide) => {
    slides.current.set(slide.id, slide);
  }, []);

  const unregister = useCallback((id: string) => {
    slides.current.delete(id);
  }, []);

  const open = useCallback((id: string) => {
    const arr = [...slides.current.values()].sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
      return a.id < b.id ? -1 : 1; // tie-break ổn định
    });
    const i = arr.findIndex((s) => s.id === id);
    setOrdered(arr.map(({ src, alt }) => ({ src, alt })));
    setIndex(i < 0 ? 0 : i);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ register, unregister, open }), [register, unregister, open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {isOpen && (
        <ImageLightbox open={isOpen} slides={ordered} index={index} onClose={() => setIsOpen(false)} />
      )}
    </LightboxContext.Provider>
  );
}
