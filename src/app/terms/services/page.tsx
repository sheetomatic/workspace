import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../../components";
import { servicesTermsPage } from "@/lib/content/terms-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "Services Terms",
  description: "Terms and conditions for Sheetomatic professional services, proposals, and payment terms.",
  path: "/terms/services",
});

export default function ServicesTermsPage() {
  const page = servicesTermsPage;

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
          </p>
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}
