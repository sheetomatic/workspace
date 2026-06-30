import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { termsIndexPage } from "@/lib/content/terms-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "Terms & Conditions",
  description: "Sheetomatic terms and conditions for services, WhatsApp API plans, and professional engagements.",
  path: "/terms",
});

export default function TermsIndexPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow={termsIndexPage.eyebrow}
        title={termsIndexPage.title}
        text={termsIndexPage.lead}
      />
      <section className="section bg-white pb-20">
        <div className="mx-auto grid max-w-3xl gap-4 px-5 sm:px-8">
          {termsIndexPage.sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="minimal-card block transition hover:border-sky-200"
            >
              <h2 className="type-h3">{section.title}</h2>
              <p className="type-body mt-2 text-slate-600">{section.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}
