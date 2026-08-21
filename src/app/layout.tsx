import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "@/styles/index.css";
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { Toaster } from '@/components/ui/toast/Toaster';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/lib/pwa/ServiceWorkerRegister';

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
  },
  icons: {
    apple: "/icon-192.png",
  },
};

// Khóa zoom trên mobile: chặn pinch-zoom, double-tap zoom và auto-zoom khi
// focus input (iOS). viewportFit=cover để tận dụng vùng safe-area (notch).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0e0c14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
        <Toaster position="top-center" expand richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
