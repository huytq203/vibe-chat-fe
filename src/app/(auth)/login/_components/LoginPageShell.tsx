import { LoginBrand } from '@/features/auth/components/login/LoginBrand';
import { LoginArtPanel } from './LoginArtPanel';

/** Props for LoginPageShell */
export interface LoginPageShellProps {
  children: React.ReactNode;
}

/**
 * Shell của `/login` (Server Component): logo ở góc trên trái, nội dung đăng nhập căn giữa
 * cột trái, khung linh vật bo góc ở cột phải (chỉ từ lg). Cả trang là vùng cuộn duy nhất nên
 * form không bị cắt khi màn hình thấp; `my-auto` căn giữa khi còn dư chiều cao.
 */
export function LoginPageShell({ children }: LoginPageShellProps) {
  return (
    <div data-auth-surface className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <div className="mx-auto grid min-h-full w-full max-w-[1320px] grid-cols-1 gap-6 px-5 pb-[max(var(--safe-bottom),1.5rem)] pt-[calc(var(--safe-top)+1.25rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-14 lg:pb-8 lg:pt-6">
        <section className="flex min-w-0 flex-col">
          <LoginBrand />
          <div className="my-auto flex w-full flex-col items-center gap-7 py-6 text-center">{children}</div>
        </section>
        <LoginArtPanel />
      </div>
    </div>
  );
}
