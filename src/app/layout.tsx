import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SheetomaticAiLauncher } from "@/components/sheetomatic-ai-launcher";
import "@/components/saas/apple-design-system.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sheetomatic | P.A.C.E. Framework for Indian MSMEs",
    template: "%s | Sheetomatic",
  },
  description:
    "P.A.C.E. framework for Indian MSMEs — FMS, IMS, CRM, Executive Meeting, and WhatsApp AI systems with Process Coordinator and Executive Assistant roles. Scale without the owner; stop spreadsheet firefighting.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=5", sizes: "any" },
      { url: "/icon.png?v=5", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png?v=5",
    shortcut: "/favicon.ico?v=5",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sheetomatic",
    title: "Sheetomatic | P.A.C.E. Framework for Indian MSMEs",
    description:
      "P.A.C.E. for MSMEs: systems (FMS, IMS, CRM, EM, WhatsApp AI) and role-based operations (Process Coordinator, Executive Assistant). Scale without the owner in one workspace.",
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
