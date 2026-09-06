import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface BrandAssetProps {
  className?: string;
  /** Để trống khi hình chỉ bổ trợ cho nhãn chữ hoặc aria-label lân cận. */
  alt?: string;
}

/** Chân dung đại diện nhất quán cho Halo AI ở các kích thước nhỏ. */
export function AiAvatar({ className, alt = '' }: BrandAssetProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbfaf5]',
        className,
      )}
    >
      <Image
        src="/asset/logo/logo2-transparent.png"
        alt={alt}
        width={160}
        height={147}
        className="h-full w-full object-contain p-[3%]"
      />
    </span>
  );
}

/** Linh vật toàn thân cho màn chào và trạng thái trống của AI. */
export function AiMascot({ className, alt = '' }: BrandAssetProps) {
  return (
    <Image
      src="/asset/logo/logo3-nobg.png"
      alt={alt}
      width={420}
      height={365}
      className={cn('object-contain', className)}
    />
  );
}

/** Props for BrandWatermark */
export interface BrandWatermarkProps {
  /** Giới hạn vùng phủ — thường là bề ngang cột form của từng shell. */
  className?: string;
}

/**
 * Dấu ấn thương hiệu phóng lớn, tràn mép, nằm dưới nội dung màn auth.
 *
 * Đặt ở lớp trang trí của shell chứ không đặt trong form: form bị `max-w-sm`
 * bó lại nên `overflow-hidden` sẽ cắt watermark thành một hình chữ nhật thấy rõ
 * mép. Ở shell, mọi mép cắt đều rơi ra ngoài viewport hoặc nấp sau panel minh
 * hoạ (panel đục và vẽ đè lên), nên không còn cạnh cứng.
 *
 * Tô bằng `bg-primary` rồi cắt theo alpha của logo (mask) thay vì đặt thẳng thẻ
 * `<img>`: mực trong file PNG là tím cố định, trong khi 7 theme của dự án đổi cả
 * nền lẫn primary bằng CSS var. Không dùng biến thể `dark:` vì `applyTheme` ghi
 * vào `:root:not(.dark)` chứ không bật class `.dark` — theme tối mặc định
 * (indigo) sẽ không khớp biến thể đó.
 */
export function BrandWatermark({ className }: BrandWatermarkProps) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="brand-watermark absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 bg-primary opacity-[0.13]" />
    </div>
  );
}
