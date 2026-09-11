import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "@/styles/index.css";
import { Framework7Shell } from '@/components/pwa/Framework7Shell';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { Toaster } from '@/components/ui/toast/Toaster';
import { Providers } from './providers';
import { appleSplashScreens } from '@/lib/pwa/apple-splash';
import { ServiceWorkerRegister } from '@/lib/pwa/ServiceWorkerRegister';
import { ViewportSync } from '@/lib/viewport';

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["100", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Halo",
  description: "Halo messaging application",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Halo",
    statusBarStyle: "black-translucent",
    startupImage: appleSplashScreens,
  },
  icons: {
    // iOS không hỗ trợ alpha cho icon home screen: dùng bản 180x180 đã flatten nền.
    apple: "/apple-touch-icon.png",
  },
};

// Khóa page zoom theo yêu cầu của trải nghiệm app-like; viewportFit=cover để tận dụng
// vùng safe-area (notch) trên thiết bị mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Khớp --sidebar của theme mặc định; ThemeProvider cập nhật lại khi đổi theme.
  themeColor: "#161820",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} antialiased`}
    >
      {/* Framework7 sở hữu geometry của html/body/root. Không đặt chiều cao
          viewport custom ở đây vì iOS có thể cắt mất vùng home indicator. */}
      <body className="flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <Framework7Shell>
            <Providers>{children}</Providers>
          </Framework7Shell>
        </ThemeProvider>
        <Toaster position="top-center" expand richColors />
        <ServiceWorkerRegister />
        <ViewportSync />
      </body>
    </html>
  );
}
