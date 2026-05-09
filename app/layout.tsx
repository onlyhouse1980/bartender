import type { Metadata, Viewport } from "next";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  applicationName: "BarStart DE",
  title: "BarStart DE",
  description:
    "Lerne die wichtigsten Drinks fuer Deutschland mit Rezepten, Glasempfehlungen, Bar Basics und Quiz.",
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BarStart DE",
  },
  icons: {
    icon: [
      { url: "/logo192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08000F",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body>
        <PwaRegistrar />
        {children}
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-QQ53CF8TVX"/>
    </html>
  );
}
