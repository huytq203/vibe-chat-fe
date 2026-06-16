'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { toQrDataUrl } from '@/lib/qr';
import type { ContactCardMetadata } from '@/features/chat/types';

type ContactCardBubbleProps = {
  contact: ContactCardMetadata;
  /** Mở/tạo cuộc trò chuyện trực tiếp với user trong danh thiếp. */
  onMessage: (contactUserId: string) => void;
};

/** Build deep-link tới user được chia sẻ. Chưa có route hồ sơ công khai →
 *  dùng query `?contact=<id>` trên app chat (xem báo cáo: follow-up route). */
function buildContactLink(contactUserId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/chat?contact=${encodeURIComponent(contactUserId)}`;
}

/** Bong bóng tin nhắn loại CONTACT: avatar + tên + @username + QR + nút Nhắn tin. */
export function ContactCardBubble({ contact, onMessage }: ContactCardBubbleProps) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void toQrDataUrl(buildContactLink(contact.contactUserId)).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, [contact.contactUserId]);

  return (
    <div className="w-[230px]">
      <div className="flex items-center gap-2.5">
        <Avatar
          name={contact.displayName}
          src={contact.avatarUrl}
          seed={contact.contactUserId}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{contact.displayName}</p>
          {contact.username && (
            <p className="truncate text-[11.5px] opacity-70">@{contact.username}</p>
          )}
        </div>
      </div>
      {qr && (
        <div className="mt-2.5 flex justify-center rounded-lg bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR là data URL cục bộ */}
          <img src={qr} alt={`Mã QR danh thiếp ${contact.displayName}`} className="h-[120px] w-[120px]" />
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-2.5 w-full"
        onClick={() => onMessage(contact.contactUserId)}
      >
        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
        Nhắn tin
      </Button>
    </div>
  );
}
