import Image from 'next/image';
import { BrandWatermark } from '@/components/common/BrandAssets';

/** Props for AuthShowcaseLayout */
export interface AuthShowcaseLayoutProps {
  children: React.ReactNode;
  /** Heading hiển thị ở góc trên panel minh hoạ */
  title?: string;
  /** Tagline ngắn dưới heading */
  tagline?: string;
}

/**
 * Layout split-screen phẳng (full-bleed) dùng cho Register: form bên trái, panel
 * thương hiệu bên phải (ẩn dưới breakpoint lg — 1024px, theo Design/DESIGN.md §8).
 *
 * Không dùng card có khung: khung bo góc buộc cả hai cột phải cao bằng nhau và
 * cùng nằm gọn trong viewport, nên form nhiều bước (register) luôn có nguy cơ bị
 * cắt. Ở dạng phẳng, mỗi cột cao đúng 100% viewport và riêng cột form tự cuộn.
 */
export function AuthShowcaseLayout({
  children,
  title = 'Halo',
  tagline = 'Kết nối không giới hạn, trò chuyện mọi lúc.',
}: AuthShowcaseLayoutProps) {
  return (
    <div data-auth-surface className="relative flex h-full overflow-hidden bg-background">
      {/* Glow nền — nằm trong lớp `overflow-hidden` của root nên phần tràn mép
          không cộng vào bất kỳ vùng cuộn nào. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Xem LoginPageShell: mép phải của watermark khớp mép panel minh hoạ để
            vết cắt bị che, phần còn lại tràn khỏi viewport. */}
        <BrandWatermark className="right-0 lg:right-1/2" />
        <div className="absolute -left-24 -top-24 hidden h-96 w-96 rounded-full bg-primary/5 blur-3xl lg:block" />
        <div className="absolute -bottom-24 -right-24 hidden h-96 w-96 rounded-full bg-primary/5 blur-3xl lg:block" />
      </div>

      {/* Cột form là vùng cuộn duy nhất. `my-auto` căn giữa khi còn dư chiều cao,
          tự về 0 khi nội dung cao hơn viewport để không mất phần đầu form. */}
      <div className="relative flex min-w-0 flex-1 justify-center overflow-y-auto overflow-x-hidden px-5 pb-[max(var(--safe-bottom),1rem)] pt-[calc(var(--safe-top)+1rem)] sm:px-6 sm:pb-[max(var(--safe-bottom),1.5rem)] sm:pt-[calc(var(--safe-top)+1.5rem)] md:p-8 lg:px-12 lg:py-8">
        <div className="my-auto w-full max-w-md">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:w-1/2 lg:flex-none">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

        <div className="absolute top-0 left-0 z-10 p-10 flex justify-center gap-5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border">
            <Image
              src="/asset/logo/logo4-192.png"
              alt=""
              width={192}
              height={192}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
          </div>
        </div>

        {/* Nhân vật minh hoạ — nền đã được chroma-key về trong suốt (xem
            docs/superpowers/specs/2026-07-07-auth-showcase-layout-design.md §8).
            Không dùng `priority`: cột này bị ẩn (`hidden`) trên mobile, nhưng
            priority vẫn preload qua thẻ <link> bất kể display — tốn băng thông
            mobile vô ích. Lazy loading mặc định của next/image bỏ qua ảnh không
            hiển thị. */}
        <div className="absolute inset-x-2 bottom-0 h-[88%]">
          <Image
            src="/asset/avatar-2.png"
            alt=""
            fill
            sizes="45vw"
            className="object-contain object-bottom"
          />
        </div>
      </div>
    </div>
  );
}
