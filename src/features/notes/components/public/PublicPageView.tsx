import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import type { z } from 'zod';
import type { publicPageSchema } from '@/features/notes/schemas';

type PublicPage = z.infer<typeof publicPageSchema>;

interface PublicPageViewProps {
  page: PublicPage;
  token: string;
}

const PUBLIC_CONTENT_STYLES = `
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .bn-block-outer {
    margin-block: 0.5rem;
  }

  h1, h2, h3, h4, h5, h6,
  [data-content-type="heading"] {
    margin: 0;
    padding-top: 0.75rem;
    font-weight: 700;
    line-height: 1.3;
  }

  h1, [data-content-type="heading"][data-level="1"] { font-size: 1.75rem; }
  h2, [data-content-type="heading"][data-level="2"] { font-size: 1.375rem; }
  h3, [data-content-type="heading"][data-level="3"] { font-size: 1.125rem; }
  h4, [data-content-type="heading"][data-level="4"] { font-size: 1rem; }
  h5, [data-content-type="heading"][data-level="5"] { font-size: 0.9375rem; }
  h6, [data-content-type="heading"][data-level="6"] { font-size: 0.875rem; }

  [data-content-type="heading"] > :is(h1, h2, h3, h4, h5, h6) {
    margin: 0;
    padding: 0;
    font: inherit;
  }

  [data-content-type="bulletListItem"],
  [data-content-type="numberedListItem"] {
    position: relative;
    padding-inline-start: 1.5rem;
  }

  [data-content-type="bulletListItem"]::before,
  [data-content-type="numberedListItem"]::before {
    position: absolute;
    inset-inline-start: 0.25rem;
  }

  [data-content-type="bulletListItem"]::before {
    content: "•";
  }

  [data-content-type="numberedListItem"]::before {
    content: attr(data-index) ".";
  }

  [data-content-type="checkListItem"] {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  [data-content-type="checkListItem"] input[type="checkbox"] {
    flex: none;
    margin-block-start: 0.35rem;
  }

  [data-content-type="codeBlock"] pre {
    margin: 0;
    overflow-x: auto;
    border-radius: 0.5rem;
    background: #f4f4f5;
    padding: 1rem;
  }
`;

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

function PublicPageBody({ page }: { page: PublicPage }) {
  if (!page.html.trim()) {
    return <p className="py-12 text-sm text-muted-foreground">Trang này chưa có nội dung.</p>;
  }

  return (
    <div className="py-8">
      {/* HTML do server dựng vẫn chứa nội dung người dùng và không đáng tin. Iframe
          sandbox không cấp script/same-origin để mã lạ không chạm DOM chính. */}
      <iframe
        title={`Nội dung trang ${page.title || 'không có tiêu đề'}`}
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={`<style>${PUBLIC_CONTENT_STYLES}</style>${page.html}`}
        className="block h-[70vh] min-h-[480px] w-full border-0 bg-background"
      />
    </div>
  );
}

export function PublicPageView({ page, token }: PublicPageViewProps) {
  const title = page.title || 'Trang không có tiêu đề';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-24 md:px-0">
        <header className="mb-8 flex items-start gap-4">
          <PageIcon icon={page.icon} className="mt-1 size-9 shrink-0 text-3xl" />
          <h1 className="min-w-0 flex-1 text-2xl font-bold leading-8 tracking-[-0.02em] [overflow-wrap:anywhere] md:text-[30px] md:leading-9">
            {title}
          </h1>
          <AuthorAvatar createdBy={page.createdBy} />
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
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      {/* Không phân biệt link sai, hết hạn, bị thu hồi hay không tồn tại: khác biệt đó
          sẽ tiết lộ một token từng tồn tại. */}
      <p role="alert" className="max-w-md text-center text-sm text-muted-foreground">
        Liên kết không hợp lệ hoặc đã hết hạn.
      </p>
    </main>
  );
}
