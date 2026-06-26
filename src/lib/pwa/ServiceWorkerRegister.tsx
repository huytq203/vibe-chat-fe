"use client";

import { useEffect } from "react";

// Đăng ký service worker để bật khả năng cài đặt PWA + offline cơ bản.
// Render null — chỉ chạy side-effect phía client.
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = (): void => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Đăng ký thất bại (vd: không HTTPS) → bỏ qua, app vẫn chạy bình thường.
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
