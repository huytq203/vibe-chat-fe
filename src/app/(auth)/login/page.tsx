import { AuthBootstrap } from '@/features/auth';
import { LoginEntry } from '@/features/auth/components/LoginEntry';
import { parseHandoffParams } from '@/features/auth/lib/handoff-params';
import { LoginPageShell } from './_components/LoginPageShell';

export const metadata = { title: 'Đăng nhập · Halo' };

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
