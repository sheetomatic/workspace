import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SheetomaticAiLauncher } from "@/components/sheetomatic-ai-launcher";
import "@/components/saas/apple-design-system.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sheetomatic | AI-Native Platform for Indian MSMEs",
    template: "%s | Sheetomatic",
  },
  description:
    "Sheetomatic Workspace and Sheetomatic AI — EM-ready every week with zero manual MIS prep. PC and EA portals monitor team performance automatically. No spreadsheet sprawl. No dedicated MIS person.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png?v=2",
    shortcut: "/favicon.ico?v=2",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sheetomatic",
    title: "Sheetomatic | AI-Native Platform for Indian MSMEs",
    description:
      "One workspace. One AI layer. EM-ready every week — without manual MIS prep, spreadsheet sprawl, or a dedicated MIS team.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "Sheetomatic logo",
      },
    ],
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
        <SheetomaticAiLauncher />
      </body>
    </html>
  );
}
