import Image from 'next/image';
import { BrandWatermark } from '@/components/common/BrandAssets';

/** Props for LoginPageShell */
export interface LoginPageShellProps {
  children: React.ReactNode;
}

/**
 * Shell phẳng (full-bleed) cho `/login`, cùng palette với register.
 *
 * Không dùng card có khung: khung buộc cả hai cột nằm gọn trong viewport nên form
 * dễ bị cắt khi màn hình thấp. Ở dạng phẳng, riêng cột form là vùng cuộn.
 */
export function LoginPageShell({ children }: LoginPageShellProps) {
  return (
    <div data-auth-surface className="relative flex h-full overflow-hidden bg-background">
      {/* Lớp trang trí — nằm trong `overflow-hidden` của root nên phần tràn mép
          không cộng vào vùng cuộn của cột form. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Watermark bám theo cột form: mép phải dừng đúng chỗ panel minh hoạ bắt
            đầu nên vết cắt bị panel (nền đục) che, các mép còn lại tràn ra ngoài
            viewport. Root đã `overflow-hidden` nên không sinh thêm vùng cuộn. */}
        <BrandWatermark className="right-0 lg:right-[42%]" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Cột form là vùng cuộn duy nhất. `my-auto` căn giữa khi còn dư chiều cao,
          tự về 0 khi nội dung cao hơn viewport để không mất phần đầu form. */}
      <div className="relative z-10 flex min-w-0 flex-1 justify-center overflow-y-auto overflow-x-hidden px-5 pt-[calc(var(--safe-top)+2rem)] pb-[calc(var(--safe-bottom)+2rem)] sm:px-6 md:p-8 lg:px-12 lg:py-8">
        <div className="my-auto w-full max-w-md">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:w-[42%] lg:flex-none">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-4 z-20 p-6">
          <Image
            src="/asset/logo/banner2-nobg.png"
            alt=""
            fill
            sizes="42vw"
            className="object-contain drop-shadow-[0_20px_34px_rgb(61_31_91/0.2)]"
          />
        </div>
      </div>
    </div>
  );
}
