import { ArrowRight, FileText } from 'lucide-react';
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
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase tracking-wide text-muted-foreground ring-2 ring-background"
    >
      {createdBy.slice(0, 2)}
    </span>
  );
}

function ChildPageMenu({ page, token }: PublicPageViewProps) {
  if (!page.includeSubpages || page.children.length === 0) return null;

  return (
    <nav aria-label="Trang con" className="border-y border-border py-4">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Trang con</h2>
      <ul className="space-y-1">
        {page.children.map((child) => (
          <li key={child.id}>
            <Link
              href={`/p/${encodeURIComponent(token)}?pageId=${encodeURIComponent(child.id)}`}
              className="group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <main className="min-h-dvh bg-background text-foreground">
      <article className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-14 md:px-6 md:pt-20">
        {/* Icon đặt trên tiêu đề (không đứng cạnh) để mép trái của tiêu đề trùng
            mép trái nội dung trong iframe — nội dung bắt đầu ở x=0. */}
        <header className="flex items-center gap-3">
          <div className="flex items-start justify-between gap-3">
            <PageIcon icon={page.icon} className="size-8 shrink-0 text-[28px] leading-8 text-muted-foreground" />
            <AuthorAvatar createdBy={page.createdBy} />
          </div>
          <h1 className="text-2xl font-bold leading-8 tracking-[-0.02em] [overflow-wrap:anywhere] md:text-[30px] md:leading-9">
            {title}
          </h1>
        </header>

        <ChildPageMenu page={page} token={token} />
        <PublicPageBody page={page} />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <Link
            href="/"
            className="rounded-sm text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Được tạo bằng Halo
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
