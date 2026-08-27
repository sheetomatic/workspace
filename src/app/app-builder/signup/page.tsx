import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { AppBuilderSignupForm } from "@/components/app-builder/signup-form";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "App Builder signup | Sheetomatic",
  description:
    "Create an App Builder account. We ask team size, industry, and city so our team can call you after you try.",
  path: "/app-builder/signup",
});

export default function AppBuilderSignupPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">
          AppBuilder · signup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Create your App Builder account
        </h1>
        <p className="mt-3 text-zinc-600">
          Free Gmail is enough. After signup you land in the builder. We keep
          your team size, industry, and city so Sheetomatic can call you later
          — no Marketplace install.
        </p>
        <AppBuilderSignupForm />
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
