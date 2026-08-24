import type { MetadataRoute } from "next";

// Web App Manifest (Next.js native) → cho phép cài đặt PWA ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Halo",
    short_name: "Halo",
    description: "Nhắn tin, gọi điện và làm việc cùng nhau trên Halo.",
    lang: "vi",
    scope: "/",
    start_url: "/chat",
    display: "standalone",
    // KHÔNG khai báo "window-controls-overlay": app chưa xử lý `env(titlebar-area-*)`
    // nên nút cửa sổ của desktop sẽ đè lên các nút bên phải ChatHeader.
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0e0c14",
    theme_color: "#0e0c14",
    orientation: "any",
    categories: ["social", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/halo-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Halo trên máy tính",
      },
      {
        src: "/screenshots/halo-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Halo trên điện thoại",
      },
    ],
    shortcuts: [
      {
        name: "Tin nhắn",
        short_name: "Chat",
        description: "Mở danh sách trò chuyện",
        url: "/chat",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Trợ lý AI",
        short_name: "AI",
        description: "Mở trợ lý AI của Halo",
        url: "/ai",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
