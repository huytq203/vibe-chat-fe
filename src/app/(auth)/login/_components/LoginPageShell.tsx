import Image from 'next/image';

/** Props for LoginPageShell */
export interface LoginPageShellProps {
  children: React.ReactNode;
}

/** Shell riêng cho `/login`, giữ bố cục Vespa nhưng dùng cùng palette với register. */
export function LoginPageShell({ children }: LoginPageShellProps) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-background md:p-4 md:pt-[calc(var(--safe-top)+1rem)] md:pb-[calc(var(--safe-bottom)+1rem)] lg:p-8">
      {/* Lớp trang trí riêng, `overflow-hidden` để glow tràn mép (-top/-bottom) bị
          cắt thay vì cộng vào vùng cuộn của container — nếu để chung, riêng glow đáy
          đã đẻ ra 96px scroll dù nội dung vừa màn hình. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute inset-y-0 left-0 hidden w-[45%] opacity-[0.04] md:block">
          <Image
            src="/asset/login-vespa-watermark.png"
            alt=""
            fill
            sizes="45vw"
            className="object-cover object-left"
          />
        </div>
      </div>

      {/* Wrapper `min-h-full` + căn giữa: khi màn hình quá thấp, wrapper cao theo nội
          dung nên card không bị cắt mép trên — lỗi kinh điển của flex centering trong
          vùng cuộn. Scroll nằm ở container ngoài, card luôn hiển thị trọn vẹn. */}
      <div className="relative flex min-h-full items-center justify-center">
        {/* `overflow-hidden` chỉ để cắt glow/ảnh minh hoạ tràn mép card — giữ đúng
            hành vi clip của `overflow-y-auto` cũ nhưng không tạo thanh cuộn. */}
        <div
          data-auth-surface
          className="flex min-h-full w-full flex-col overflow-hidden bg-background md:min-h-0 md:max-w-5xl md:rounded-2xl md:border md:border-border md:shadow-2xl lg:flex-row"
        >
          <div className="relative z-10 flex flex-1 items-center justify-start px-5 pt-[calc(var(--safe-top)+2rem)] pb-[calc(var(--safe-bottom)+2rem)] sm:px-6 md:p-8 lg:p-10">
            {children}
          </div>

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
    </div>
  );
}
