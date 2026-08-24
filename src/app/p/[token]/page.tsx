import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { ApiError } from '@/lib/api/client';
import { PasswordGate } from '@/features/notes/components/public/PasswordGate';
import {
  PublicPageUnavailable,
  PublicPageView,
} from '@/features/notes/components/public/PublicPageView';
import { PUBLIC_PAGE_SESSION_COOKIE, publicPagesApi } from '@/services/notion.api';

interface PublicPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pageId?: string | string[] }>;
}

type PublicPageResult =
  | { state: 'data'; page: Awaited<ReturnType<typeof publicPagesApi.detail>> }
  | { state: 'password' }
  | { state: 'error' };

const loadPublicPage = cache(
  async (token: string, pageId: string | undefined, sessionToken: string | undefined) => {
    try {
      const page = await publicPagesApi.detail(token, { pageId, sessionToken });
      return { state: 'data', page } satisfies PublicPageResult;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SHARE_PASSWORD_REQUIRED') {
        return { state: 'password' } satisfies PublicPageResult;
      }
      return { state: 'error' } satisfies PublicPageResult;
    }
  },
);

async function resolveRequest(props: PublicPageProps) {
  const [{ token }, searchParams, cookieStore] = await Promise.all([
    props.params,
    props.searchParams,
    cookies(),
  ]);
  const rawPageId = searchParams.pageId;
  const pageId = typeof rawPageId === 'string' ? rawPageId : undefined;
  const sessionToken = cookieStore.get(PUBLIC_PAGE_SESSION_COOKIE)?.value;
  return { token, pageId, sessionToken };
}

function robots(allowIndexing: boolean): Metadata['robots'] {
  return { index: allowIndexing, follow: allowIndexing };
}

export async function generateMetadata(props: PublicPageProps): Promise<Metadata> {
  const request = await resolveRequest(props);
  const result = await loadPublicPage(request.token, request.pageId, request.sessionToken);

  if (result.state !== 'data') {
    return { title: 'Trang công khai · Halo', robots: robots(false) };
  }
  return {
    title: `${result.page.title || 'Trang không có tiêu đề'} · Halo`,
    robots: robots(result.page.allowIndexing),
  };
}

export default async function PublicPage(props: PublicPageProps) {
  const request = await resolveRequest(props);
  const result = await loadPublicPage(request.token, request.pageId, request.sessionToken);

  if (result.state === 'password') return <PasswordGate token={request.token} />;
  if (result.state === 'error') return <PublicPageUnavailable />;
  return <PublicPageView page={result.page} token={request.token} />;
}
