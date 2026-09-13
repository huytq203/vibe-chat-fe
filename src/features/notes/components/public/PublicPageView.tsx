import { ArrowRight, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { z } from 'zod';
import type { publicPageSchema } from '@/features/notes/schemas';
import { PublicPageBody } from './PublicPageBody';

type PublicPage = z.infer<typeof publicPageSchema>;

interface PublicPageViewProps {
  page: PublicPage;
  token: string;
}

function PageIcon({ icon, className }: { icon: string | null; className?: string }) {
  if (icon) return <span className={className}>{icon}</span>;
  return <FileText aria-hidden="true" className={className} />;
}

function AuthorAvatar({ createdBy }: { createdBy?: string }) {
  if (!createdBy) return null;

  return (
    <span
      role="img"
      aria-label={`Tác giả ${createdBy}`}
      title={`Tác giả ${createdBy}`}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/15"
    >
      {createdBy.slice(0, 2)}
    </span>
  );
}

function ChildPageMenu({ page, token }: PublicPageViewProps) {
  if (!page.includeSubpages || page.children.length === 0) return null;

  return (
    <nav aria-label="Trang con" className="my-10 border-y border-border py-6 md:my-12">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Khám phá thêm</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {page.children.map((child) => (
          <li key={child.id}>
            <Link
              href={`/p/${encodeURIComponent(token)}?pageId=${encodeURIComponent(child.id)}`}
              className="group flex min-h-12 items-center gap-3 rounded-xl bg-muted/55 px-4 py-3 text-sm font-medium text-foreground transition-[background-color,color] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <PageIcon icon={child.icon} className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{child.title || 'Trang không có tiêu đề'}</span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PublicPageView({ page, token }: PublicPageViewProps) {
  const title = page.title || 'Trang không có tiêu đề';

  return (
    <main className="h-full min-h-0 w-full overflow-y-auto overscroll-y-contain bg-background text-foreground selection:bg-primary/20">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/90 pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            aria-label="Về trang chủ Halo"
            className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2 font-semibold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image src="/icon-192.png" width={28} height={28} alt="" className="size-7 rounded-lg" />
            <span>Halo</span>
            <span aria-hidden="true" className="h-4 w-px bg-border" />
            <span className="font-normal text-muted-foreground">Trang chia sẻ</span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:block">Chỉ đọc</span>
        </div>
      </div>

      {page.coverUrl && (
        <div className="mx-auto h-40 w-full max-w-[1120px] overflow-hidden bg-muted sm:h-52 md:h-64">
          {/* Ảnh bìa là nội dung do người dùng cung cấp và có thể đến từ domain động. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.coverUrl} alt="" className="size-full object-cover" />
        </div>
      )}

      <article className="mx-auto w-full max-w-[860px] px-5 pb-[max(var(--safe-bottom),3rem)] pt-12 sm:px-8 md:pt-16">
        <header className="border-b border-border pb-8 md:pb-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <PageIcon
              icon={page.icon}
              className="size-10 shrink-0 text-[30px] leading-10 text-muted-foreground"
            />
            <AuthorAvatar createdBy={page.createdBy} />
          </div>
          <h1 className="max-w-[18ch] text-[30px] font-bold leading-[1.2] tracking-[-0.03em] [overflow-wrap:anywhere] md:text-4xl">
            {title}
          </h1>
        </header>

        <ChildPageMenu page={page} token={token} />
        <PublicPageBody page={page} />

        <footer className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <span>Nội dung được chia sẻ từ Halo</span>
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tìm hiểu Halo
          </Link>
        </footer>
      </article>
    </main>
  );
}

export function PublicPageUnavailable() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      {/* Không phân biệt link sai, hết hạn, bị thu hồi hay không tồn tại: khác biệt đó
          sẽ tiết lộ một token từng tồn tại. */}
      <p role="alert" className="max-w-md text-center text-sm text-muted-foreground">
        Liên kết không hợp lệ hoặc đã hết hạn.
      </p>
    </main>
  );
}
