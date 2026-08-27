import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "App Builder privacy | Sheetomatic",
  description:
    "How Sheetomatic App Builder uses Google sign-in and your Sheets when you connect a Gmail account.",
  path: "/app-builder/privacy",
});

export default function AppBuilderPrivacyPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">
          App Builder · privacy
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Privacy for Google Connect
        </h1>
        <p className="mt-4 text-zinc-600">
          App Builder lets a business owner sign in with Gmail and use Google
          Sheets as the database. We do not sell Sheet data. We do not read
          your whole Drive.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-zinc-950">What we access</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-600">
          <li>Your Google email, so we know which account connected.</li>
          <li>
            Spreadsheets you create in App Builder, or a Sheet you paste / open
            in the studio.
          </li>
          <li>
            Read and write on that Sheet only: tabs, rows, and the cells the
            app shows.
          </li>
        </ul>
        <h2 className="mt-8 text-lg font-semibold text-zinc-950">What we do not access</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-600">
          <li>Your full Google Drive file list.</li>
          <li>Gmail, Calendar, Photos, or other Google products.</li>
          <li>Sheets you never opened or created in App Builder.</li>
        </ul>
        <h2 className="mt-8 text-lg font-semibold text-zinc-950">Storage</h2>
        <p className="mt-3 text-zinc-600">
          Refresh tokens stay on our server, scoped to your App Builder
          workspace, so the studio can keep reading and writing the connected
          Sheet. Disconnect Google in the studio to revoke that token. You can
          also revoke access in your Google Account permissions.
        </p>
        <p className="mt-8 text-sm text-zinc-500">
          Questions: training@sheetomatic.in
        </p>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
