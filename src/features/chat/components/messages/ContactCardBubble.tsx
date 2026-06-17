"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Avatar } from "@/features/chat/components/common/Avatar";
import { toQrDataUrl } from "@/lib/qr";
import type { ContactCardMetadata } from "@/features/chat/types";

type ContactCardBubbleProps = {
  contact: ContactCardMetadata;
  onMessage: (contactUserId: string) => void;
  onCardClick?: () => void;
};

function buildContactLink(contactUserId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/chat?contact=${encodeURIComponent(contactUserId)}`;
}

export function ContactCardBubble({
  contact,
  onMessage,
  onCardClick,
}: ContactCardBubbleProps) {
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
    <div className="w-[270px] overflow-hidden rounded-xl">
      <div
        style={{
          backgroundImage: "url('/asset/Gemini_Generated_Image_g39t52g39t52g39t.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex">

        {/* Avatar + info */}
        <button
          type="button"
          onClick={onCardClick}
          disabled={!onCardClick}
          className="flex w-full items-center px-4 pb-3 pt-3 text-left disabled:cursor-default"
        >
          <div className="pr-2">
            <Avatar
              name={contact.displayName}
              src={contact.avatarUrl}
              seed={contact.contactUserId}
              size="md"
            />
          </div>
          <span className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-gray-900 drop-shadow">
              {contact.displayName}
            </p>
            {contact.username && (
              <p className="truncate text-[11.5px] text-gray-800">
                @{contact.username}
              </p>
            )}
          </span>
        </button>

        {/* QR code */}
        {qr && (
          <div className="bg-card px-3 py-3">
            <div className="flex flex-1 justify-center rounded-lg bg-white p-2 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR là data URL cục bộ */}
              <img
                src={qr}
                alt={`Mã QR danh thiếp ${contact.displayName}`}
                className="w-24 object-contain"
              />
            </div>
          </div>
        )}
      </div>
      {/* Nhắn tin button */}
      <div className="border-t border-border bg-card px-3 py-2.5">
        <Button
          size="md"
          className="w-full bg-primary/80 hover:bg-primaryS"
          onClick={() => onMessage(contact.contactUserId)}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Nhắn tin
        </Button>
      </div>
      </div>

    </div>
  );
}
