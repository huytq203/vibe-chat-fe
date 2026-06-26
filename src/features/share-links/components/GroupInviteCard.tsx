'use client';

import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { ShareLinkGroupPreview } from '../types';
import { useUseShareLink } from '../hooks/use-mutations';
import { ERROR_LABEL } from '../enums/invite';
import { InvitePhoneShell } from './InvitePhoneShell';
import { InviteTopBar } from './InviteTopBar';

type Props = { group: ShareLinkGroupPreview; code: string; onBack: () => void; modal?: boolean };

export function GroupInviteCard({ group, code, onBack, modal }: Props) {
  const router = useRouter();
  const useLink = useUseShareLink();

  async function handleJoin() {
    try {
      const result = await useLink.mutateAsync(code);
      if (result.type === 'GROUP') {
        // joinApproval bật → tạo join-request chờ duyệt, KHÔNG vào thẳng (xem 28 §5).
        if (result.group.pending) {
          toast.success('Đã gửi yêu cầu vào nhóm, chờ duyệt');
          onBack();
          return;
        }
        toast.success(result.group.joined ? 'Đã tham gia nhóm' : 'Mở nhóm');
        router.push(`/chat/${result.group.conversationId}`);
      }
    } catch (e) {
      const errCode = e instanceof ApiError ? e.code : '';
      toast.error(ERROR_LABEL[errCode] ?? (e instanceof Error ? e.message : 'Có lỗi xảy ra'));
    }
  }

  const inner = (
    <>
      <InviteTopBar title="Thông tin nhóm" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="relative mb-[52px]">
          <div className="h-[130px] bg-gradient-to-br from-primary/50 via-primary/20 to-secondary" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar
              name={group.name} src={group.avatarUrl} type="group" size="lg"
              className="!h-[88px] !w-[88px] !rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        <div className="flex flex-col items-center px-5 pb-4 pt-1 text-center">
          <h1 className="text-[22px] font-extrabold tracking-[-0.3px] text-foreground">
            {group.name ?? 'Nhóm chat'}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {group.memberCount} thành viên
          </p>
          {group.description && (
            <p className="mt-3 text-center text-[13.5px] leading-relaxed text-foreground/80">
              {group.description}
            </p>
          )}
        </div>

        <div className="mx-5 border-t border-border" />

        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleJoin}
            disabled={useLink.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-[11px] text-[14px] font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
          >
            {useLink.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Users className="h-4 w-4" />
            }
            Tham gia nhóm
          </button>
        </div>
      </div>
    </>
  );

  if (modal) return inner;
  return <InvitePhoneShell>{inner}</InvitePhoneShell>;
}
