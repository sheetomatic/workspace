import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = {
  ...marketingMetadata({
    title: "Scale Without the Owner | BCI Suite for MSMEs",
    description:
      "BCI Suite: Business Control & Intelligence for system-driven MSMEs. FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm give owner-led teams visible control without spreadsheet firefighting.",
    path: "/",
  }),
  keywords: [
    "MSME",
    "scale without owner",
    "BCI Suite",
    "Business Control and Intelligence",
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
