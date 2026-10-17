import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Be_Vietnam_Pro } from "next/font/google";
import "@/styles/index.css";
import { Framework7Shell } from '@/components/pwa/Framework7Shell';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { THEME_COOKIE } from '@/lib/theme/theme-cookie';
import { THEME_STYLE_ID, buildThemeCss, resolveTheme } from '@/lib/theme/themes';
import { Toaster } from '@/components/ui/toast/Toaster';
import { Providers } from './providers';
import { appleSplashScreens } from '@/lib/pwa/apple-splash';
import { AppUpdateNotifier } from '@/features/app-update';
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
export async function generateViewport(): Promise<Viewport> {
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    // Khớp --sidebar của theme đang chọn (mặc định Blue); ThemeProvider cập nhật lại khi đổi theme.
    themeColor: theme.colors.muted,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server đọc cookie theme và render sẵn token màu trong HTML đầu tiên: không nháy
  // từ màu mặc định sang theme đã chọn. Tên theme đã được resolveTheme lọc về danh sách có sẵn.
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = resolveTheme(themeCookie);

  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} antialiased`}
    >
      <head>
        {/* CSS sinh từ hằng số theme của dự án (không có dữ liệu người dùng) nên an toàn để chèn thẳng. */}
        <style id={THEME_STYLE_ID} dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
      </head>
      {/* Framework7 sở hữu geometry của html/body/root. Không đặt chiều cao
          viewport custom ở đây vì iOS có thể cắt mất vùng home indicator. */}
      <body className="flex flex-col" suppressHydrationWarning>
        <ThemeProvider initialThemeName={themeCookie ? theme.name : undefined}>
          <Framework7Shell>
            <Providers>
              {children}
              <AppUpdateNotifier />
            </Providers>
          </Framework7Shell>
        </ThemeProvider>
        <Toaster position="top-center" expand richColors />
        <ServiceWorkerRegister />
        <ViewportSync />
      </body>
    </html>
  );
}
