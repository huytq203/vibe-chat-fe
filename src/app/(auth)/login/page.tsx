import { preconnect, preload } from 'react-dom';
import { env } from '@/config/env';
import { AuthBootstrap } from '@/features/auth';
import { LoginEntry } from '@/features/auth/components/LoginEntry';
import { parseHandoffParams } from '@/features/auth/lib/handoff-params';
import { GIS_ORIGIN, GIS_SRC } from '@/lib/google/identity';
import { LoginPageShell } from './_components/LoginPageShell';

export const metadata = { title: 'Đăng nhập · Halo' };

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Báo trình duyệt tải script Google ngay trong <head> của HTML đầu tiên, thay vì đợi hydrate
  // xong mới nạp: nút Google hiện sớm hơn rõ rệt.
  if (env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    preconnect(GIS_ORIGIN);
    preload(GIS_SRC, { as: 'script' });
  }
  const handoff = parseHandoffParams(await searchParams);
  return (
    <>
      {/* Trình duyệt mở từ app desktop có thể đã đăng nhập web sẵn — vẫn phải hiện
          form để cấp mã chuyển giao, không được tự vào /chat. */}
      <AuthBootstrap redirectIfAuthed={handoff ? undefined : '/chat'} />
      <LoginPageShell>
        <LoginEntry handoff={handoff} />
      </LoginPageShell>
    </>
  );
}
