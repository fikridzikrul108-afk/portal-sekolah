
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const font = Poppins({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Akademik - SD Islam Al-Barkah",
  description:
    "Portal akademik dan manajemen sekolah SD Islam Al-Barkah",
  applicationName: "Portal Akademik SD Islam Al-Barkah",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Portal Al-Barkah",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
