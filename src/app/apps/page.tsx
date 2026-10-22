import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Cloud, ShieldCheck } from "lucide-react";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { buildWhatsAppUrl } from "@/app/site-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { listCloudSoftwareCatalog } from "@/lib/templates/cloud-softwares";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import "@/components/marketing/cloud-apps-page.css";

export const metadata: Metadata = marketingMetadata({
  title: "Cloud Apps | Sheetomatic",
  description:
    "Native Sheetomatic cloud apps for connected daily operations, with workspace access, roles, and implementation support.",
  path: "/apps",
});

const launchSteps = [
  "Choose the app that solves the daily operational problem first.",
  "Confirm the workspace and licensing path with Sheetomatic.",
  "Set up the team and start using the app in daily work.",
];

export default function AppsPage() {
  const apps = listCloudSoftwareCatalog();

  return (
    <MarketingPage>
      <SiteHeader />
      <section className="cloud-apps-hero" aria-labelledby="cloud-apps-title">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="type-kicker">Native Sheetomatic apps</p>
          <h1 id="cloud-apps-title">Apps your team runs. Not files your owner has to manage.</h1>
          <p>
            Cloud apps live inside Sheetomatic Workspace, so your daily work, people,
            access, and support stay connected from the start.
          </p>
          <div className="cloud-apps-hero-actions">
            <a className="btn-cta btn-primary" href="#apps-library">Explore apps <ArrowRight size={18} aria-hidden /></a>
            <Link className="btn-cta btn-secondary" href="/templates">Browse all templates</Link>
          </div>
        </div>
      </section>

      <section className="cloud-apps-library" id="apps-library" aria-label="Cloud app library">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="cloud-apps-section-head">
            <p className="type-kicker">Ready to run</p>
            <h2>Choose one job. Give the team one working app.</h2>
          </div>
          <div className="cloud-apps-grid">
            {apps.map((app) => (
              <article className="cloud-app-card" key={app.id}>
                <div className="cloud-app-card-image">
                  <Image src={app.thumbnailUrl} alt="" width={720} height={520} sizes="(max-width: 700px) 100vw, 48vw" />
                </div>
                <div className="cloud-app-card-copy">
                  <span className="cloud-app-label"><Cloud size={15} aria-hidden /> Cloud app</span>
                  <h2>{app.name}</h2>
                  <p>{app.description}</p>
                  <p className="cloud-app-price">₹{app.priceMonthlyInr.toLocaleString("en-IN")} <span>/ month per shop</span></p>
                  <ul>
                    {app.features.map((feature) => <li key={feature}><CheckCircle2 size={16} aria-hidden />{feature}</li>)}
                  </ul>
                  <div className="cloud-app-card-actions">
                    <a
                      className="btn-cta btn-primary"
                      href={buildWhatsAppUrl(`Hi Sheetomatic, I want to discuss ${app.name} for my business.`)}
                    >
                      Discuss this app
                    </a>
                    <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>Customer sign in</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cloud-apps-launch" aria-labelledby="cloud-apps-launch-title">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="cloud-apps-launch-head">
            <p className="type-kicker">A clear launch path</p>
            <h2 id="cloud-apps-launch-title">From the right app to daily use.</h2>
          </div>
          <ol className="cloud-apps-launch-steps">
            {launchSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}
          </ol>
          <p className="cloud-apps-launch-note"><ShieldCheck size={18} aria-hidden /> Apps are part of the Sheetomatic workspace—not a disconnected spreadsheet copy.</p>
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}
