"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button/Button";

interface NoticeCardProps {
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  isLive?: boolean;
}

/** Thẻ thông báo nổi dùng chung cho PWA (mất mạng, mời cài) và báo bản cập nhật. */
export function NoticeCard({ icon, children, action, onDismiss, dismissLabel, isLive }: NoticeCardProps) {
  return (
    <section
      role={isLive ? "status" : undefined}
      className="pointer-events-auto flex max-w-md flex-wrap items-center gap-3 rounded-xl bg-background px-4 py-3 text-sm text-foreground shadow-[0_8px_28px_rgba(0,0,0,0.22)]"
    >
      {icon}
      <p className="min-w-0 flex-1">{children}</p>
      {action}
      {onDismiss && (
        <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label={dismissLabel}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
