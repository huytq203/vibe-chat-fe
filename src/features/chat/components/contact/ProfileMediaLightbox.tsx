'use client';

import dynamic from 'next/dynamic';
import type { LightboxSlide } from '@/components/common/ImageLightbox';

// Lazy-load lightbox + CSS — chỉ tải khi user thực sự mở ảnh (§9).
const ImageLightbox = dynamic(
  () => import('@/components/common/ImageLightbox').then((m) => m.ImageLightbox),
  { ssr: false },
);

/** Ảnh hồ sơ đang được mở to. */
export type ProfileMediaTarget = 'cover' | 'avatar';

/** Props for ProfileMediaLightbox */
export interface ProfileMediaLightboxProps {
  coverUrl: string | null | undefined;
  avatarUrl: string | null | undefined;
  /** Tên chủ hồ sơ — dùng cho alt của ảnh. */
  name: string;
  /** Ảnh đang mở; `null` là đóng. */
  target: ProfileMediaTarget | null;
  onClose: () => void;
}

/**
 * Xem to ảnh bìa / ảnh đại diện của một hồ sơ.
 *
 * Gom cả hai vào một album để user vuốt qua lại thay vì phải đóng rồi mở lại.
 * Không gắn handler tải: ảnh hồ sơ là URL công khai, không đi qua đường ký lại
 * theo conversation như ảnh trong tin nhắn.
 */
export function ProfileMediaLightbox({
  coverUrl,
  avatarUrl,
  name,
  target,
  onClose,
}: ProfileMediaLightboxProps) {
  const slides: LightboxSlide[] = [];
  if (coverUrl) slides.push({ src: coverUrl, alt: `Ảnh bìa của ${name}` });
  if (avatarUrl) slides.push({ src: avatarUrl, alt: `Ảnh đại diện của ${name}` });

  if (!target || slides.length === 0) return null;

  const index = target === 'cover' ? 0 : coverUrl ? 1 : 0;
  return <ImageLightbox open slides={slides} index={index} onClose={onClose} />;
}
