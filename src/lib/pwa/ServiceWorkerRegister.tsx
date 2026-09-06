"use client";

import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button/Button";
import { isElectron } from "@/lib/electron";
import { useInstallBanner } from "./useInstallBanner";
import { useOnlineStatus } from "./useOnlineStatus";
import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

interface PwaCardProps {
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  isLive?: boolean;
}

function PwaCard({ icon, children, action, onDismiss, dismissLabel, isLive }: PwaCardProps) {
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

/**
 * Điều phối vòng đời PWA: đăng ký service worker, nhắc cập nhật, mời cài đặt và
 * báo mất mạng. Không render gì khi mọi thứ bình thường.
 */
export function ServiceWorkerRegister(): ReactNode {
  // Electron đã là app desktop: không cần cài, không cần SW cache (gây UI cũ sau update).
  const isSupported = !isElectron();
  const isOnline = useOnlineStatus(isSupported);
  const { mode, install, dismiss: dismissInstall } = useInstallBanner(isSupported);
  const { waitingWorker, isUpdating, applyUpdate, dismissUpdate } =
    useServiceWorkerUpdate(isSupported);

  const hasUpdate = waitingWorker !== null;
  if (isOnline && !hasUpdate && mode === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom,0px)+0.75rem)] z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-5"
      aria-live="polite"
      aria-atomic="true"
    >
      {!isOnline && (
        <PwaCard isLive icon={<WifiOff className="size-5 shrink-0 text-warning" aria-hidden="true" />}>
          Mất kết nối. Bạn vẫn có thể xem màn hình ngoại tuyến.
        </PwaCard>
      )}

      {hasUpdate && (
        <PwaCard
          icon={<RefreshCw className="size-5 shrink-0 text-primary" aria-hidden="true" />}
          action={
            <Button size="sm" onClick={applyUpdate} isLoading={isUpdating}>
              Cập nhật
            </Button>
          }
          onDismiss={dismissUpdate}
          dismissLabel="Để sau"
        >
          Halo đã có phiên bản mới.
        </PwaCard>
      )}

      {mode === "prompt" && !hasUpdate && (
        <PwaCard
          icon={<Download className="size-5 shrink-0 text-primary" aria-hidden="true" />}
          action={
            <Button size="sm" onClick={install}>
              Cài đặt
            </Button>
          }
          onDismiss={dismissInstall}
          dismissLabel="Đóng lời mời cài đặt"
        >
          Cài Halo để mở nhanh và dùng như một ứng dụng.
        </PwaCard>
      )}

      {mode === "ios" && !hasUpdate && (
        <PwaCard
          icon={<Share className="size-5 shrink-0 text-primary" aria-hidden="true" />}
          onDismiss={dismissInstall}
          dismissLabel="Đóng hướng dẫn cài đặt"
        >
          Cài Halo: chạm <strong>Chia sẻ</strong> rồi chọn{" "}
          <strong>Thêm vào MH chính</strong>.
        </PwaCard>
      )}
    </div>
  );
}
