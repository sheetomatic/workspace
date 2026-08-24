import type { Metadata } from "next";
import { AppBuilderLanding } from "@/components/app-builder/app-builder-landing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "App Builder for Google Sheets | Try free on sheetomatic.com",
  description:
    "Speak or type an app. Connect your Gmail Google Sheet. Free credits to try. Buy when it works. No Google Workspace. No Marketplace install.",
  path: "/app-builder",
});

export default function AppBuilderLandingPage() {
  return <AppBuilderLanding />;
}
