import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../../components";
import { whatsappApiTermsPage } from "@/lib/content/terms-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "WhatsApp API Terms",
  description: "Terms and conditions for Sheetomatic unofficial WhatsApp API subscription and Google Sheets integration.",
  path: "/terms/whatsapp-api",
});

export default function WhatsappApiTermsPage() {
  const page = whatsappApiTermsPage;

  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero eyebrow={page.eyebrow} title={page.title} text={`Last updated: ${page.updated}`} />
      <section className="section bg-white pb-20">
        <div className="mx-auto max-w-3xl space-y-8 px-5 sm:px-8">
          {page.sections.map((section) => (
            <article key={section.title}>
              <h2 className="type-h3">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="type-body mt-3 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
          <p>
            <Link className="text-sky-700 underline" href="/terms">
              ← All terms
            </Link>
            {" · "}
            <Link className="text-sky-700 underline" href="/whatsapp-plans">
              WhatsApp plans
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}
