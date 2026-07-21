import Image from 'next/image';

/** Props for LoginPageShell */
export interface LoginPageShellProps {
  children: React.ReactNode;
}

/** Shell riêng cho `/login`, giữ bố cục Vespa nhưng dùng cùng palette với register. */
export function LoginPageShell({ children }: LoginPageShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 lg:p-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[45%] opacity-[0.04] md:block">
        <Image
          src="/asset/login-vespa-watermark.png"
          alt=""
          fill
          sizes="45vw"
          className="object-cover object-left"
        />
      </div>

      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl lg:flex-row">
        <div className="relative z-10 flex flex-1 items-center justify-start p-8 lg:p-10">{children}</div>

        <div className="relative hidden bg-sidebar lg:block lg:w-[42%]">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 z-20 -translate-x-44 -translate-y-10 p-6">
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
