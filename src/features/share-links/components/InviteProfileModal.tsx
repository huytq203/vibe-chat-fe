'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dialog as BaseDialog } from '@base-ui/react';
import { InviteCard } from './InviteCard';

export function InviteProfileModal() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const code = searchParams.get('invite');

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('invite');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (!code) return null;

  return (
    <BaseDialog.Root open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 flex h-[calc(100vh-32px)] max-h-[820px] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-muted shadow-[0_32px_80px_rgba(0,0,0,0.7)] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <InviteCard code={code} modal onClose={handleClose} />
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
