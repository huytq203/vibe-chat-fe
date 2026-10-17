import Image from 'next/image';
import { Bell, FolderOpen, ListChecks, MessageCircle, NotebookText, Sparkles, Video, type LucideIcon } from 'lucide-react';

/** Vị trí theo % của khung vuông, tính sẵn trên vòng bán kính 47% (mỗi 60 độ từ đỉnh). */
const ORBIT_ITEMS: { Icon: LucideIcon; label: string; position: string }[] = [
  { Icon: Bell, label: 'Thông báo', position: 'left-[50%] top-[3%]' },
  { Icon: MessageCircle, label: 'Tin nhắn', position: 'left-[90%] top-[27%]' },
  { Icon: ListChecks, label: 'Công việc', position: 'left-[90%] top-[73%]' },
  { Icon: FolderOpen, label: 'Tệp', position: 'left-[50%] top-[97%]' },
  { Icon: NotebookText, label: 'Ghi chú', position: 'left-[10%] top-[73%]' },
  { Icon: Video, label: 'Cuộc gọi', position: 'left-[10%] top-[27%]' },
];

const SPARKLES: { position: string; size: string; motion: string }[] = [
  { position: 'left-[14%] top-[12%]', size: 'size-[22px]', motion: 'animate-twinkle' },
  { position: 'right-[12%] top-[8%]', size: 'size-4', motion: 'animate-twinkle-b' },
  { position: 'right-[6%] bottom-[28%]', size: 'size-5', motion: 'animate-twinkle-c' },
];

const TOAST_CLASS =
  'absolute z-20 flex animate-float items-center gap-2.5 rounded-2xl bg-background px-3.5 py-2.5 text-[13px] font-semibold text-foreground shadow-lg shadow-primary/20 motion-reduce:animate-none';
const TOAST_ICON_CLASS = 'flex size-[26px] items-center justify-center rounded-[9px] bg-secondary text-primary';

/**
 * Khung minh hoạ bên phải màn đăng nhập (chỉ hiện từ lg), nằm trong một thẻ bo góc có chừa lề
 * thay vì chia đôi màn hình. Linh vật đứng giữa, các mảng của Halo (thông báo, tin nhắn, việc,
 * tệp, ghi chú, cuộc gọi) quay chậm quanh quỹ đạo. Biểu tượng quay ngược để luôn thẳng đứng.
 * Server Component: toàn bộ chuyển động là CSS, không cần JS ở client.
 */
export function LoginArtPanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative isolate hidden min-h-[34rem] overflow-hidden rounded-[28px] bg-[radial-gradient(90%_70%_at_50%_24%,var(--secondary),color-mix(in_oklab,var(--primary)_30%,var(--secondary)))] lg:block"
    >
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(color-mix(in_oklab,var(--primary)_22%,transparent)_1.2px,transparent_1.4px)] [background-size:26px_26px] [mask-image:radial-gradient(70%_60%_at_50%_45%,#000,transparent)]" />

      <div className="absolute inset-x-6 bottom-[76px] top-6 grid place-items-center">
        <div className="relative aspect-square w-[min(100%,29rem)]">
          <span className="absolute -inset-[8%] rounded-full border border-primary/10" />
          <span className="absolute inset-[3%] rounded-full border border-primary/20" />
          <span className="absolute inset-[19%] rounded-full border border-dashed border-primary/20" />

          <div className="absolute inset-0 animate-orbit motion-reduce:animate-none">
            {ORBIT_ITEMS.map(({ Icon, label, position }) => (
              <div key={label} className={`absolute ${position} -translate-x-1/2 -translate-y-1/2`}>
                <span className="flex size-[46px] animate-orbit-reverse items-center justify-center rounded-2xl bg-background text-primary shadow-lg shadow-primary/20 motion-reduce:animate-none">
                  <Icon className="size-5" />
                </span>
              </div>
            ))}
          </div>

          {SPARKLES.map(({ position, size, motion }) => (
            <Sparkles key={position} className={`absolute ${position} ${size} ${motion} text-warning motion-reduce:animate-none`} />
          ))}

          <span className="absolute inset-x-[20%] bottom-[3%] h-[4.5%] rounded-full bg-foreground/15 blur-md" />
          <div className="absolute inset-x-[16%] bottom-[4%] top-[9%] animate-float motion-reduce:animate-none">
            <Image
              src="/asset/banner-login.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 28vw, 0px"
              className="object-contain drop-shadow-[0_18px_26px_rgb(21_46_120/0.26)]"
            />
          </div>
        </div>
      </div>

      <div className={`${TOAST_CLASS} left-[5%] top-[5%]`}>
        <span className={TOAST_ICON_CLASS}>
          <MessageCircle className="size-[15px]" />
        </span>
        Tin nhắn mới từ nhóm
      </div>
      <div className={`${TOAST_CLASS} bottom-[13%] right-[5%] [animation-delay:2.4s]`}>
        <span className={TOAST_ICON_CLASS}>
          <NotebookText className="size-[15px]" />
        </span>
        Ghi chú họp đã lưu
      </div>

      <p className="absolute inset-x-7 bottom-6 z-20 max-w-xs text-[15px] font-bold text-foreground">
        Tin nhắn, ghi chú, công việc và tệp. Một nơi, một lần đăng nhập.
      </p>
    </aside>
  );
}
