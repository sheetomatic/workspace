import Link from "next/link";
import { FinalCta, MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { buildWhatsAppUrl, whatsappDisplayNumber } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { listLicensedKits } from "@/lib/addons/licensed-kits";
import { formatInrPaise, rupeesToPaise } from "@/lib/billing/money";
import "./minimal-premium.css";
import { ContactButtons } from "./marketing-buttons";

const jobCardWa = buildWhatsAppUrl(
  "Hi Sheetomatic, I want the Repair Workshop Job Card FMS license (₹999/mo) for my workshop.",
);

export function AddonsPageContent() {
  const kits = listLicensedKits();
  const featured = kits.find((kit) => kit.key === "workshop-job-card");
  const rest = kits.filter((kit) => kit.key !== "workshop-job-card");

  return (
    <MarketingPage>
      <SiteHeader />
      <section className="minimal-hero minimal-hero-centered">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <p className="type-kicker text-sky-700">Right to use — not a custom job</p>
          <h1 className="minimal-hero-title mt-4">Licensed kits and add-ons</h1>
          <p className="minimal-hero-lead">
            Pay monthly for a kit your team actually runs: native FMS, in-app forms,
            WhatsApp internal alerts, Monday EM. One org, all seats in that workspace.
          </p>
        </div>
      </section>

      {featured ? (
        <section className="products-catalog minimal-strip bg-white pb-12" id={featured.key}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <article className="product-minimal-card featured">
              <p className="type-kicker text-sky-700">First kit</p>
              <h2 className="mt-2">{featured.name}</h2>
              <p>{featured.icp}</p>
              <p>{featured.description}</p>
              <p>
                <strong>{formatInrPaise(rupeesToPaise(featured.priceMonthlyInr))}</strong>
                / month per org ·{" "}
                {formatInrPaise(rupeesToPaise(featured.priceAnnualInr))} / year · excl. GST
              </p>
              <p>
                Needs an FMS workspace (Starter from ₹4,999/mo). License is org-wide.
                You cannot resell it. Cancel anytime — jobs already in the system stay.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="btn-cta btn-whatsapp" href={jobCardWa}>
                  WhatsApp {whatsappDisplayNumber}
                </a>
                <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>
                  Existing customer — open workspace
                </Link>
                <Link className="btn-cta btn-secondary" href="/pricing">
                  Workspace plans
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="products-catalog minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="product-minimal-grid">
            {rest.map((kit) => (
              <article className="product-minimal-card" id={kit.key} key={kit.key}>
                <h3>{kit.name}</h3>
                <p className="type-body-sm">{kit.icp}</p>
                <p>{kit.description}</p>
                <p>
                  {formatInrPaise(rupeesToPaise(kit.priceMonthlyInr))} / month
                  {kit.shippable ? "" : " · coming next"}
                </p>
                <Link href={kit.href}>
                  {kit.kind === "module_addon"
                    ? "See workspace pricing"
                    : "On the roadmap"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="minimal-strip pb-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2>How the license works</h2>
          <ol>
            <li>Buy or already have a Sheetomatic FMS workspace.</li>
            <li>Admin opens FMS → Licensed kits → Request license.</li>
            <li>The kit line shows on the UPI invoice. Pay. We confirm the UTR.</li>
            <li>Install. Staff log jobs on the native form. EM picks up delays.</li>
          </ol>
          <p>
            AppSheet / Google Sheets copies stay on{" "}
            <Link href="/templates">/templates</Link>. New kits are in-app, not Sheet
            formulas.
          </p>
          <ContactButtons />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
