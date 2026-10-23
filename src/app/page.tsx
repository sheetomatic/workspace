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
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Sheetomatic",
        url: "https://sheetomatic.com",
        logo: "https://sheetomatic.com/icon.png",
        sameAs: [
          "https://www.linkedin.com/in/sheetomatic/",
          "https://www.facebook.com/sheetomaticofficial",
          "https://www.instagram.com/sheetomatic/",
          "https://x.com/sheetomatic",
        ],
      },
      {
        "@type": "WebSite",
        name: "Sheetomatic",
        url: "https://sheetomatic.com",
        description:
          "Business Systems Suite for system-driven MSMEs: flow, inventory, task, checklist, and WhatsApp automation in one operating system.",
      },
      {
        "@type": "Service",
        name: "Sheetomatic Business Systems Suite",
        provider: {
          "@type": "Organization",
          name: "Sheetomatic",
        },
        areaServed: ["IN", "AE", "OM", "HK"],
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Owner-led MSMEs with operational teams",
        },
        description:
          "Operational systems for flow monitoring, inventory, checklists, tasks, executive review, and WhatsApp automation.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage />
    </>
  );
}
