import type { Metadata } from "next";
import Link from "next/link";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { WhatsAppButton } from "@/components/marketing/marketing-buttons";
import {
  whatsappPlanPrice,
  whatsappPlansPage,
} from "@/lib/content/whatsapp-plans-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "Unofficial WhatsApp API Plans",
  description:
    "Sheetomatic unofficial WhatsApp API — Google Sheets integration, annual subscription INR 1,499, setup from INR 3,000+, and recharge plans.",
  path: "/whatsapp-plans",
});

export default function WhatsappPlansPage() {
  const page = whatsappPlansPage;

  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero eyebrow={page.eyebrow} title={page.title} text={page.lead} />

      <section className="section bg-white pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 sm:grid-cols-2 sm:px-8">
          <article className="minimal-card">
            <h2 className="type-h3">{page.freeApi.title}</h2>
            <p className="type-body mt-3">{page.freeApi.text}</p>
          </article>
          <article className="minimal-card">
            <h2 className="type-h3">{page.setup.title}</h2>
            <p className="type-body mt-3">
              {page.setup.text}{" "}
              <strong>{page.setup.priceLabel}</strong>
            </p>
            <p className="type-small mt-2 text-slate-600">{page.setup.note}</p>
          </article>
          <article className="minimal-card sm:col-span-2">
            <h2 className="type-h3">{page.annual.title}</h2>
            <p className="type-display mt-2 text-sky-700">
              {whatsappPlanPrice(page.annual.price)}
              <span className="type-body text-slate-600"> / year</span>
            </p>
            <p className="type-body mt-2">{page.annual.text}</p>
          </article>
        </div>
      </section>

      <section className="section bg-slate-50 pb-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="type-h2 text-center">Recharge plans</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {page.rechargePlans.map((plan) => (
              <article key={plan.name} className="minimal-card text-center">
                <h3 className="type-h4">{plan.name}</h3>
                <p className="type-display mt-3 text-sky-700">
                  {whatsappPlanPrice(plan.price)}
                </p>
                <p className="type-small mt-2 text-slate-600">{plan.duration}</p>
              </article>
            ))}
          </div>
          <article className="minimal-card mx-auto mt-6 max-w-xl text-center">
            <h3 className="type-h4">{page.integrationBundle.name}</h3>
            <p className="type-display mt-3 text-sky-700">
              {whatsappPlanPrice(page.integrationBundle.price)}
            </p>
          </article>
        </div>
      </section>

      <section className="section bg-white pb-16">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="type-body text-slate-600">{page.termsNote}</p>
          <p className="mt-4">
            <Link className="text-sky-700 underline" href={page.termsHref}>
              Read WhatsApp API terms &amp; conditions
            </Link>
          </p>
          <div className="cta-stack mx-auto mt-8 max-w-sm">
            <WhatsAppButton className="btn-block" label="WhatsApp for setup" />
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
