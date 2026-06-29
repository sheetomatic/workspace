import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = {
  ...marketingMetadata({
    title: "Scale Without the Owner | P.A.C.E. for MSMEs",
    description:
      "For running MSMEs: P.A.C.E. your business on Sheetomatic — systems for profit (FMS, IMS), leads (WhatsApp AI), conversions (CRM), and review (EM). Process Coordinator and Executive Assistant roles hold teams accountable. Build, Manage, Scale without spreadsheet firefighting.",
    path: "/",
  }),
  keywords: [
    "MSME",
    "scale without owner",
    "P.A.C.E framework",
    "FMS IMS CRM",
    "role-based operations",
    "WhatsApp AI MSME",
    "Executive Meeting weekly",
    "Sheetomatic Workspace",
  ],
};

export default function Home() {
  return <HomePage />;
}
