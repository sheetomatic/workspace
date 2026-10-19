import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = {
  ...marketingMetadata({
    title: "Scale Without the Owner | Business Systems Suite for MSMEs",
    description:
      "Business Systems Suite for system-driven MSMEs. FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm give owner-led teams visible control without spreadsheet firefighting.",
    path: "/",
  }),
  keywords: [
    "MSME",
    "scale without owner",
    "Business Systems Suite",
    "ready-to-use business software",
    "FMS IMS",
    "system-driven MSME",
    "process coordinator executive assistant",
    "review rhythm",
    "Sheetomatic Workspace",
  ],
};

export default function Home() {
  return <HomePage />;
}
