import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaClient from "./_components/PwaClient";

export const metadata: Metadata = {
  title: "QUEEN STORE",
  description: "متجر QUEEN STORE الإلكتروني",
  applicationName: "QUEEN STORE",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "QUEEN", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1a1512",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
