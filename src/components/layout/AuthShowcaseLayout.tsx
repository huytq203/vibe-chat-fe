import Image from 'next/image';
import { MessageCircle } from 'lucide-react';

/** Props for AuthShowcaseLayout */
export interface AuthShowcaseLayoutProps {
  children: React.ReactNode;
  /** Heading hiển thị đè lên ảnh minh hoạ */
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
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center p-4 lg:p-8">{children}</div>

      <div className="relative hidden overflow-hidden lg:block lg:w-[45%]">
        {/* Không dùng `priority`: cột này bị ẩn (`hidden`) trên mobile, nhưng priority
            vẫn preload qua thẻ <link> bất kể display — tốn băng thông mobile vô ích.
            Lazy loading mặc định của next/image bỏ qua ảnh không hiển thị. */}
        <Image src="/asset/banner.png" alt="" fill sizes="45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 z-10 p-10">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
        </div>
      </div>
    </div>
  );
}
