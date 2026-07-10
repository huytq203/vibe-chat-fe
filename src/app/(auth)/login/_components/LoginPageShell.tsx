import Image from 'next/image';

/** Props for LoginPageShell */
export interface LoginPageShellProps {
  children: React.ReactNode;
}

/**
 * Shell riêng cho `/login`, clone pixel-exact theo Figma "Login Page Design - 2"
 * (node 2:2, https://www.figma.com/design/W6TbpTC0DL1wUqkA1OEbsI). Theo quyết
 * định của user, màu sắc/bo góc pill của thiết kế này được giữ nguyên hardcode
 * thay vì map qua token Charcoal+Cyan của `Design/DESIGN.md` — override có chủ
 * đích, chỉ áp dụng cho route `/login` (KHÔNG dùng lại cho `/register`, vẫn
 * dùng `AuthShowcaseLayout` + theme gốc). Xem addendum trong
 * docs/superpowers/specs/2026-07-07-auth-showcase-layout-design.md.
 */
export function LoginPageShell({ children }: LoginPageShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-r from-[#00b4db] to-[#0083b0] p-4 lg:p-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[45%] opacity-10 md:block">
        <Image
          src="/asset/login-vespa-watermark.png"
          alt=""
          fill
          sizes="45vw"
          className="object-cover object-left"
        />
      </div>

      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl lg:flex-row">
        <div className="flex flex-1 items-center justify-start p-8 lg:p-10">{children}</div>

        <div className="relative hidden bg-[#e2eef5] lg:block lg:w-[42%]">
          <div className="absolute inset-0 p-6 -translate-y-10 -translate-x-44">
            <Image
              src="/asset/login-vespa-card.png"
              alt=""
              fill
              sizes="42vw"
              className="object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
