import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import type { z } from 'zod';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { publicPageSchema } from '@/features/notes/schemas';
import { render, screen } from '@/test/test-utils';
import { generateMetadata } from '@/app/p/[token]/page';
import { PublicPageView } from './PublicPageView';

const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn(() => undefined) }));

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const NOTION_URL = 'http://localhost:3007';
const server = setupServer();

type PublicPage = z.infer<typeof publicPageSchema>;

function buildPublicPage(overrides: Partial<PublicPage> = {}): PublicPage {
  return {
    id: 'page-root',
    title: 'Ghi chú công khai',
    icon: '📖',
    coverUrl: null,
    html: '<p>Nội dung an toàn</p>',
    includeSubpages: true,
    children: [{ id: 'page-child', title: 'Trang con', icon: null }],
    allowIndexing: true,
    ...overrides,
  };
}

function envelope(data: PublicPage) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: '2026-08-25T00:00:00.000Z',
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('trang ghi chú công khai', () => {
  it('cô lập HTML người dùng trong iframe sandbox thay vì DOM chính', () => {
    const html = '<h2>Nội dung lạ</h2><script>document.body.dataset.xss="true"</script>';
    render(<PublicPageView page={buildPublicPage({ html })} token="public-token" />);

    const frame = screen.getByTitle('Nội dung trang Ghi chú công khai');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain(html);
    expect(screen.queryByText('Nội dung lạ')).not.toBeInTheDocument();
  });

  it('nhúng CSS định dạng list/checklist/code vào iframe công khai', () => {
    const html =
      '<div class="bn-block-content" data-content-type="bulletListItem"><p class="bn-inline-content">muc mot</p></div>';
    render(<PublicPageView page={buildPublicPage({ html })} token="public-token" />);

    const frame = screen.getByTitle('Nội dung trang Ghi chú công khai');
    const srcdoc = frame.getAttribute('srcdoc') ?? '';

    expect(srcdoc).toContain('<style');
    expect(srcdoc).toContain('bulletListItem');
    expect(srcdoc).toContain('numberedListItem');
    expect(srcdoc).toContain('checkListItem');
    expect(srcdoc).toContain('codeBlock');
    expect(srcdoc).toContain(html);
  });

  it('ẩn hẳn menu trang con khi includeSubpages tắt', () => {
    render(
      <PublicPageView
        page={buildPublicPage({ includeSubpages: false })}
        token="public-token"
      />,
    );

    expect(screen.queryByRole('navigation', { name: 'Trang con' })).not.toBeInTheDocument();
  });

  it('ẩn hẳn menu trang con khi mảng children rỗng', () => {
    render(
      <PublicPageView page={buildPublicPage({ children: [] })} token="public-token" />,
    );

    expect(screen.queryByRole('navigation', { name: 'Trang con' })).not.toBeInTheDocument();
  });

  it('hiện trạng thái trang trống nhưng vẫn giữ tiêu đề', () => {
    render(<PublicPageView page={buildPublicPage({ html: '   ' })} token="public-token" />);

    expect(screen.getByRole('heading', { name: 'Ghi chú công khai' })).toBeInTheDocument();
    expect(screen.getByText('Trang này chưa có nội dung.')).toBeInTheDocument();
    expect(screen.queryByTitle(/Nội dung trang/)).not.toBeInTheDocument();
  });

  it('đặt metadata noindex và nofollow khi allowIndexing tắt', async () => {
    const token = 'metadata-noindex';
    server.use(
      http.get(`${NOTION_URL}/api/v1/public/${token}`, () =>
        envelope(buildPublicPage({ allowIndexing: false })),
      ),
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
