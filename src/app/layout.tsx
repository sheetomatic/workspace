import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SheetomaticAiLauncher } from "@/components/sheetomatic-ai-launcher";
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
        url: "/images/sheetomatic-logo.png",
        width: 1000,
        height: 1000,
        alt: "Sheetomatic logo",
      },
    ],
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
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
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <SheetomaticAiLauncher />
      </body>
    </html>
  );
}
