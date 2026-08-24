import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { INVALID_PUBLIC_LINK_MESSAGE, PasswordGate } from './PasswordGate';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const APP_ORIGIN = window.location.origin;
const server = setupServer();

const errorCases = [
  { label: 'sai mật khẩu', token: 'wrong-password', upstreamMessage: 'Mật khẩu sai' },
  { label: 'link hết hạn', token: 'expired', upstreamMessage: 'Link đã hết hạn' },
  { label: 'link bị thu hồi', token: 'revoked', upstreamMessage: 'Link đã bị thu hồi' },
  { label: 'link không tồn tại', token: 'missing', upstreamMessage: 'Không tìm thấy link' },
];

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('cổng mật khẩu của trang công khai', () => {
  it.each(errorCases)('$label vẫn hiện đúng một thông điệp bảo mật', async ({ token, upstreamMessage }) => {
    server.use(
      http.post(`${APP_ORIGIN}/p/${token}/unlock`, () =>
        HttpResponse.json({ error: { message: upstreamMessage } }, { status: 404 }),
      ),
    );
    renderWithProviders(<PasswordGate token={token} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu'), 'mật-khẩu-thử');
    await user.click(screen.getByRole('button', { name: 'Mở khoá' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_PUBLIC_LINK_MESSAGE);
    expect(screen.getAllByText(INVALID_PUBLIC_LINK_MESSAGE)).toHaveLength(1);
  });

  it('làm mới Server Component sau khi mở khoá thành công', async () => {
    server.use(
      http.post(`${APP_ORIGIN}/p/success/unlock`, () =>
        HttpResponse.json({ unlocked: true })),
    );
    renderWithProviders(<PasswordGate token="success" />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu'), 'đúng-mật-khẩu');
    await user.click(screen.getByRole('button', { name: 'Mở khoá' }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
