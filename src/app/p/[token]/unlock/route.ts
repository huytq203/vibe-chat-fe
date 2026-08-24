import { NextResponse } from 'next/server';
import { publicUnlockInputSchema } from '@/features/notes/schemas';
import { PUBLIC_PAGE_SESSION_COOKIE, publicPagesApi } from '@/services/notion.api';

export const runtime = 'nodejs';

const SESSION_MAX_AGE_SECONDS = 30 * 60;
const INVALID_LINK_MESSAGE = 'Liên kết không hợp lệ hoặc đã hết hạn.';

function invalidLinkResponse(status = 404): NextResponse {
  // Giữ cùng thông điệp cho mật khẩu sai, link hết hạn, bị thu hồi và không tồn tại;
  // phân biệt các ca này sẽ biến FE thành oracle dò token.
  return NextResponse.json({ error: { message: INVALID_LINK_MESSAGE } }, { status });
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const input = publicUnlockInputSchema.safeParse(await readBody(request));
  if (!input.success) return invalidLinkResponse(400);

  const { token } = await context.params;
  try {
    const { sessionToken } = await publicPagesApi.unlock(token, input.data.password);
    const response = NextResponse.json({ unlocked: true });
    // Cookie httpOnly giữ token phiên ngoài JavaScript; script chèn được vào trang
    // cũng không thể đọc và gửi token này ra ngoài.
    response.cookies.set(PUBLIC_PAGE_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: `/p/${encodeURIComponent(token)}`,
    });
    return response;
  } catch {
    return invalidLinkResponse();
  }
}
