import { AuthBootstrap } from '@/features/auth';
import { InviteCard } from '@/features/share-links';

export const metadata = { title: 'Lời mời · Halo' };

/** Deep link chia sẻ hồ sơ / nhóm. Cần đăng nhập để resolve + dùng link. */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <AuthBootstrap requireAuth redirectTo="/login" />
      <InviteCard code={code} />
    </>
  );
}
