import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SheetomaticAiLauncher } from "@/components/sheetomatic-ai-launcher";
import "@/components/saas/apple-design-system.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sheetomatic | BCI Suite for Indian MSMEs",
    template: "%s | Sheetomatic",
  },
  description:
    "BCI Suite: Business Control & Intelligence for system-driven MSMEs — FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm in one operating system.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=7", sizes: "any" },
      { url: "/icon.png?v=7", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png?v=7",
    shortcut: "/favicon.ico?v=7",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sheetomatic",
    title: "Sheetomatic | BCI Suite for Indian MSMEs",
    description:
      "BCI Suite for system-driven MSMEs: FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm in one operating system.",
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
