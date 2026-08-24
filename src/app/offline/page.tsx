/* eslint-disable @next/next/no-img-element -- offline shell cannot depend on Next image optimization */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đang ngoại tuyến | Halo",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "#0e0c14",
        color: "#f7f5ff",
        display: "flex",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        inset: 0,
        justifyContent: "center",
        padding: "24px",
        position: "fixed",
      }}
    >
      <section style={{ maxWidth: "440px", textAlign: "center" }}>
        <img
          src="/icon-192.png"
          width="88"
          height="88"
          alt=""
          style={{ borderRadius: "24px", margin: "0 auto 24px" }}
        />
        <h1 style={{ fontSize: "28px", lineHeight: 1.2, margin: "0 0 12px" }}>
          Bạn đang ngoại tuyến
        </h1>
        <p style={{ color: "#c8c2d8", lineHeight: 1.6, margin: "0 0 24px" }}>
          Kiểm tra kết nối mạng rồi thử lại. Tin nhắn mới sẽ được đồng bộ khi Halo kết nối lại.
        </p>
        <Link
          href="/chat"
          style={{
            background: "#7c5ce5",
            borderRadius: "10px",
            color: "#ffffff",
            display: "inline-block",
            fontWeight: 600,
            minHeight: "44px",
            padding: "12px 20px",
            textDecoration: "none",
          }}
        >
          Thử kết nối lại
        </Link>
      </section>
    </main>
  );
}
