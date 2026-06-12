import { redirect } from 'next/navigation';

export const metadata = { title: 'Lời mời · Halo' };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/chat?invite=${encodeURIComponent(code)}`);
}
