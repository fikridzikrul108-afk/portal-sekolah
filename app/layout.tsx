import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const font = Poppins({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Akademik — SD Islam Al-Barkah",
  description: "Portal akademik dan manajemen sekolah SD Islam Al-Barkah",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
