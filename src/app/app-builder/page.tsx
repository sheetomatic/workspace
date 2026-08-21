import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { APP_BUILDER_LOGIN_HREF, APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";

export const metadata: Metadata = marketingMetadata({
  title: "App Builder for Google Sheets | Try free on sheetomatic.com",
  description:
    "Speak or type an app. Connect your Gmail Google Sheet. Free credits to try. Buy when it works. No Google Workspace. No Marketplace install.",
  path: "/app-builder",
});

export default function AppBuilderLandingPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">
          AppBuilder · on our website
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">
          Build a phone app on your Google Sheet. Try here first. Buy when it works.
        </h1>
        <p className="mt-4 text-lg leading-7 text-zinc-600">
          Free Gmail is enough. Paste your Sheet, speak what you need, use free
          credits. Staff do not need Google. We never send you to the Workspace
          Marketplace.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={marketingButtonClass("primary")} href="/app-builder/signup">
            Sign up
          </Link>
          <a className={marketingButtonClass("secondary")} href={APP_BUILDER_STUDIO_HREF}>
            Try App Builder
          </a>
          <a className={marketingButtonClass("secondary")} href={APP_BUILDER_LOGIN_HREF}>
            Sign in
          </a>
        </div>
        <ol className="mt-12 grid gap-6 text-zinc-700 sm:grid-cols-3">
          <li>
            <strong className="block text-zinc-950">1. Connect</strong>
            Paste a Sheet from gmail.com. ₹0 to Google.
          </li>
          <li>
            <strong className="block text-zinc-950">2. Try</strong>
            Voice or type. 40 free credits. Phone preview on your data.
          </li>
          <li>
            <strong className="block text-zinc-950">3. Buy</strong>
            When credits end, pay us — not per salesman, not Marketplace.
          </li>
        </ol>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
