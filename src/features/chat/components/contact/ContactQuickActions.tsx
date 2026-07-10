"use client";

import { Pin, PinOff, Search, Users } from "lucide-react";
import { QuickAction } from "@/features/chat/components/common/QuickAction";
import { MuteButton } from "./MuteButton";
import type { ContactInfoData } from "@/features/chat/hooks/useContactInfor";

type ContactQuickActionsProps = {
  data: ContactInfoData;
  onCreateGroup: () => void;
  onSearch: () => void;
};

export function ContactQuickActions({ data, onCreateGroup, onSearch }: ContactQuickActionsProps) {
  const { isDirect, isPinned, handleTogglePin, conversation } = data;

  return (
    <section className="flex justify-center items-center">
      {isDirect && (
        <QuickAction icon={<Users className="h-[18px] w-[18px]" />} label="Tạo nhóm" onClick={onCreateGroup} />
      )}
      {!isDirect && (
        <QuickAction icon={isPinned ? <PinOff className="h-[18px] w-[18px]" /> : <Pin className="h-[18px] w-[18px]" />} label={isPinned ? "Bỏ ghim" : "Ghim"} onClick={handleTogglePin} />
      )}
      <QuickAction icon={<Search className="h-[18px] w-[18px]" />} label="Tìm" onClick={onSearch} />
      <MuteButton conversation={conversation} />
    </section>
  );
}
