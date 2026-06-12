'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useResolveShareLink } from '../hooks/use-query';
import { InvitePhoneShell } from './InvitePhoneShell';
import { InviteTopBar } from './InviteTopBar';
import { UserProfileCard } from './UserProfileCard';
import { GroupInviteCard } from './GroupInviteCard';

type Props = { code: string; modal?: boolean; onClose?: () => void };

export function InviteCard({ code, modal, onClose }: Props) {
  const { data, isLoading, isError } = useResolveShareLink(code);
  const router = useRouter();

  function goBack() {
    if (onClose) { onClose(); return; }
    if (window.history.length > 1) router.back();
    else router.push('/chat');
  }

  function Shell({ children }: { children: React.ReactNode }) {
    if (modal) return <>{children}</>;
    return <InvitePhoneShell>{children}</InvitePhoneShell>;
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <InviteTopBar title="Trang cá nhân" onBack={goBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-base font-semibold text-foreground">Link không khả dụng</p>
          <p className="text-sm text-muted-foreground">Link không tồn tại hoặc đã bị xoá.</p>
          <button
            type="button"
            onClick={goBack}
            className="mt-3 rounded-xl border border-border bg-secondary px-5 py-2 text-[14px] font-semibold text-foreground"
          >
            Đóng
          </button>
        </div>
      </Shell>
    );
  }

  if (!data.isActive) {
    const reason = data.isRevoked ? 'Link đã bị thu hồi'
      : data.isExpired ? 'Link đã hết hạn'
        : data.isExhausted ? 'Link đã hết lượt dùng'
          : 'Link không còn hiệu lực';
    return (
      <Shell>
        <InviteTopBar title="Trang cá nhân" onBack={goBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-base font-semibold text-foreground">{reason}</p>
          <button
            type="button"
            onClick={goBack}
            className="mt-3 rounded-xl border border-border bg-secondary px-5 py-2 text-[14px] font-semibold text-foreground"
          >
            Đóng
          </button>
        </div>
      </Shell>
    );
  }

  if (data.type === 'USER' && data.user) {
    return <UserProfileCard previewUser={data.user} code={code} onBack={goBack} modal={modal} />;
  }

  if (data.type === 'GROUP' && data.group) {
    return <GroupInviteCard group={data.group} code={code} onBack={goBack} modal={modal} />;
  }

  return (
    <Shell>
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Nội dung link đã bị xoá.
      </div>
    </Shell>
  );
}
