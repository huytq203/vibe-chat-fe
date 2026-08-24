import Image from 'next/image';
import { MessageCircle } from 'lucide-react';

/** Props for AuthShowcaseLayout */
export interface AuthShowcaseLayoutProps {
  children: React.ReactNode;
  /** Heading hiển thị ở góc trên panel minh hoạ */
  title?: string;
  /** Tagline ngắn dưới heading */
  tagline?: string;
}

/**
 * Layout split-screen dùng chung cho Login/Register: form bên trái, panel
 * thương hiệu bên phải (ẩn dưới breakpoint lg — 1024px, theo Design/DESIGN.md §8).
 */
export function AuthShowcaseLayout({
  children,
  title = 'Halo',
  tagline = 'Kết nối không giới hạn, trò chuyện mọi lúc.',
}: AuthShowcaseLayoutProps) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-background md:p-4 md:pt-[calc(var(--safe-top)+1rem)] md:pb-[calc(var(--safe-bottom)+1rem)] lg:p-8">
      {/* Glow nền quanh thẻ — gợi tinh thần backdrop màu của bản Figma tham khảo,
          nhưng dùng token cyan sẵn có thay vì màu cam/xanh cyan sáng của Figma.
          Bọc trong lớp `overflow-hidden` để phần tràn mép không cộng vào vùng cuộn. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Wrapper `min-h-full` + căn giữa: khi màn hình quá thấp, wrapper cao theo nội
          dung nên card không bị cắt mép trên — lỗi kinh điển của flex centering trong
          vùng cuộn. Scroll nằm ở container ngoài, card luôn hiển thị trọn vẹn. */}
      <div className="relative flex min-h-full items-center justify-center">
        {/* Một thẻ bo góc duy nhất chứa cả form và panel minh hoạ — khớp cấu trúc
            "1 card nổi giữa trang" của thiết kế Figma tham khảo, thay vì 2 cột
            full-bleed tách rời. */}
        <div
          data-auth-surface
          className="flex min-h-full w-full overflow-hidden bg-background md:min-h-0 md:max-w-5xl md:rounded-2xl md:border md:border-border md:shadow-2xl"
        >
          <div className="flex flex-1 items-center justify-center px-5 pt-[calc(var(--safe-top)+2rem)] pb-[calc(var(--safe-bottom)+2rem)] sm:px-6 md:p-8 lg:p-12">
            {children}
          </div>

          <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:w-[45%]">
            <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

            <div className="absolute top-0 left-0 z-10 p-10">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
            </div>

            {/* Nhân vật minh hoạ — nền đã được chroma-key về trong suốt (xem
                docs/superpowers/specs/2026-07-07-auth-showcase-layout-design.md §8).
                Không dùng `priority`: cột này bị ẩn (`hidden`) trên mobile, nhưng
                priority vẫn preload qua thẻ <link> bất kể display — tốn băng thông
                mobile vô ích. Lazy loading mặc định của next/image bỏ qua ảnh không
                hiển thị. */}
            <div className="absolute inset-x-2 h-[88%] ">
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
      </div>
    </div>
  );
}
