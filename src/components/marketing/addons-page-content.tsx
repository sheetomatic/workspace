import Link from "next/link";
import { FinalCta, MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { buildWhatsAppUrl, whatsappDisplayNumber } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { getLicensedKit, MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { formatInrPaise, rupeesToPaise } from "@/lib/billing/money";
import "./minimal-premium.css";
import { ContactButtons } from "./marketing-buttons";

const shopWa = buildWhatsAppUrl(
  "Hi Sheetomatic, I want the Mobile Shop app license (₹999/mo) for my mobile shop — new/used phones, repairs, accessories.",
);

export function AddonsPageContent() {
  const featured = getLicensedKit(MOBILE_SHOP_KIT_KEY);

  return (
    <MarketingPage>
      <SiteHeader />
      <section className="minimal-hero minimal-hero-centered">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <p className="type-kicker text-sky-700">Right to use — mobile shops</p>
          <h1 className="minimal-hero-title mt-4">Mobile Shop app</h1>
          <p className="minimal-hero-lead">
            Counter app for shops that sell new phones, used phones, repairs,
            and accessories. Big buttons. Few taps. Not a spreadsheet.
          </p>
        </div>
      </section>

      {featured ? (
        <section className="products-catalog minimal-strip bg-white pb-16" id={featured.key}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <article className="product-minimal-card featured">
              <p className="type-kicker text-sky-700">First SKU</p>
              <h2 className="mt-2">{featured.name}</h2>
              <p>{featured.icp}</p>
              <p>{featured.description}</p>
              <ul>
                <li>New phone sale — नया सेल</li>
                <li>Used phone — पुराना फोन</li>
                <li>Repairs — रिपेयर</li>
                <li>Accessories — एक्सेसरी (covers, chargers, earphones — qty)</li>
                <li>Stock in — स्टॉक इन (purchase / return / transfer; IMEI or qty)</li>
                <li>Stock out — स्टॉक आउट (sale, used sale, accessory, part used, supplier return)</li>
              </ul>
              <p>
                <strong>{formatInrPaise(rupeesToPaise(featured.priceMonthlyInr))}</strong>
                / month per org ·{" "}
                {formatInrPaise(rupeesToPaise(featured.priceAnnualInr))} / year · excl. GST
              </p>
              <p>
                Needs a Sheetomatic workspace. License is org-wide. Not for resale.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="btn-cta btn-whatsapp" href={shopWa}>
                  WhatsApp {whatsappDisplayNumber}
                </a>
                <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>
                  Existing customer — sign in
                </Link>
                <Link className="btn-cta btn-secondary" href="/pricing">
                  Workspace plans
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="minimal-strip pb-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2>How the license works</h2>
          <ol>
            <li>Have (or buy) a Sheetomatic workspace.</li>
            <li>Admin: FMS → Licensed kits → Request license.</li>
            <li>Pay the UPI invoice. We confirm the UTR.</li>
            <li>Open Mobile shop. Counter starts.</li>
          </ol>
          <p>
            AppSheet / Sheets copies remain on <Link href="/templates">/templates</Link>.
            This SKU is the in-app shop floor.
          </p>
          <ContactButtons />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
