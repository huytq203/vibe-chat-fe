"use client";

import { Download, Share, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button/Button";
import { isElectron } from "@/lib/electron";
import { NoticeCard } from "./NoticeCard";
import { useInstallBanner } from "./useInstallBanner";
import { useOnlineStatus } from "./useOnlineStatus";
import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

/**
 * Điều phối vòng đời PWA: đăng ký service worker, mời cài đặt và báo mất mạng.
 * Báo bản cập nhật nằm ở `features/app-update` (dựa trên semver, không theo worker).
 * Không render gì khi mọi thứ bình thường.
 */
export function ServiceWorkerRegister(): ReactNode {
  // Electron đã là app desktop: không cần cài, không cần SW cache (gây UI cũ sau update).
  const isSupported = !isElectron();
  const isOnline = useOnlineStatus(isSupported);
  const { mode, install, dismiss: dismissInstall } = useInstallBanner(isSupported);
  useServiceWorkerUpdate(isSupported);

  if (isOnline && mode === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom,0px)+0.75rem)] z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-5"
      aria-live="polite"
      aria-atomic="true"
    >
      {!isOnline && (
        <NoticeCard isLive icon={<WifiOff className="size-5 shrink-0 text-warning" aria-hidden="true" />}>
          Mất kết nối. Bạn vẫn có thể xem màn hình ngoại tuyến.
        </NoticeCard>
      )}

      {mode === "prompt" && (
        <NoticeCard
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
        </NoticeCard>
      )}

      {mode === "ios" && (
        <NoticeCard
          icon={<Share className="size-5 shrink-0 text-primary" aria-hidden="true" />}
          onDismiss={dismissInstall}
          dismissLabel="Đóng hướng dẫn cài đặt"
        >
          Cài Halo: chạm <strong>Chia sẻ</strong> rồi chọn{" "}
          <strong>Thêm vào MH chính</strong>.
        </NoticeCard>
      )}
    </div>
  );
}
