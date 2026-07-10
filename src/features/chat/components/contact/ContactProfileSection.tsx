"use client";

import { PenIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge/Badge";
import { Avatar, type AvatarStatus } from "@/features/chat/components/common/Avatar";
import type { ContactInfoData } from "@/features/chat/hooks/useContactInfor";

type ContactProfileSectionProps = {
  data: ContactInfoData;
  avatarUrl: string | null;
  isGroup: boolean;
  onOpenProfile: () => void;
  onOpenNickname: () => void;
};

export function ContactProfileSection({
  data,
  avatarUrl,
  isGroup,
  onOpenProfile,
  onOpenNickname,
}: ContactProfileSectionProps) {
  const { name, description, isDirect, otherUserId, status, statusText, statusVariant } = data;

  return (
    <section className="flex flex-col items-center">
      {isDirect && otherUserId ? (
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Xem trang cá nhân"
          title="Xem trang cá nhân"
          className="mb-3 rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar name={name} src={avatarUrl} size="lg" status={status as AvatarStatus} />
        </button>
      ) : (
        <Avatar
          name={name}
          src={avatarUrl}
          type={isGroup ? 'group' : 'user'}
          size="lg"
          status={status as AvatarStatus}
          className=""
        />
      )}
        <Badge variant={statusVariant} size="sm" >
        {statusText}
      </Badge>
      <div className="text-[17px] text-foreground flex items-center gap-2">
        <div className="flex items-center gap-2 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{name}</span>
            {/* Nút đặt biệt danh chỉ cho DIRECT — group đổi tên trong Cài đặt nhóm. */}
            {isDirect && otherUserId && (
              <button
                type="button"
                onClick={onOpenNickname}
                className="border border-border p-1 rounded-md hover:bg-secondary transition-colors duration-200"
                aria-label="Đặt tên gợi nhớ">
                <PenIcon className="h-[14px] w-[14px] text-muted-foreground" />
              </button>
            )}
          </div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
      </div>

    </section>
  );
}
