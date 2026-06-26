import type { MetadataRoute } from "next";

// Web App Manifest (Next.js native) → cho phép cài đặt PWA ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Halo",
    short_name: "Halo",
    description: "Halo messaging application",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0c14",
    theme_color: "#0e0c14",
    orientation: "portrait",
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
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
