import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SheetomaticAiLauncher } from "@/components/sheetomatic-ai-launcher";
import "@/components/saas/apple-design-system.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sheetomatic | Automation and AI Consultancy for MSME Operations",
    template: "%s | Sheetomatic",
  },
  description:
    "Sheetomatic is an Automation and AI Consultancy for Indian MSMEs: AI tasks, follow-ups, client workspaces, Google Sheets, AppSheet, dashboards, and WhatsApp automation.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sheetomatic",
    title: "Sheetomatic | Automation and AI for MSME Operations",
    description:
      "MIS, Google Sheets, AppSheet, dashboards, WhatsApp API, and AI task delegation for Indian MSMEs.",
    images: [
      {
        url: "/images/sheetomatic-logo.svg",
        width: 1000,
        height: 1000,
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
