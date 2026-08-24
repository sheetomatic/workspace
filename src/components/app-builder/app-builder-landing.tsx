import Link from "next/link";
import { EyeOff, ImageIcon, Sigma, Zap } from "lucide-react";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { APP_BUILDER_LOGIN_HREF, APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";
import "./app-builder-landing.css";

const steps = [
  {
    n: "01",
    title: "Connect",
    text: "Paste a Sheet from gmail.com. ₹0 to Google. Staff never need a Workspace seat.",
  },
  {
    n: "02",
    title: "Try",
    text: "Voice or type. 40 free credits. Phone preview on your own rows — not a demo CSV.",
  },
  {
    n: "03",
    title: "Buy",
    text: "When credits end, pay us. Not per salesman. Not the Marketplace.",
  },
];

const extras = [
  {
    icon: Sigma,
    title: "Computed columns",
    text: "Lookup, Qty × Rate, if-then. Shown on the phone. Not written back to the Sheet.",
  },
  {
    icon: EyeOff,
    title: "Who sees what",
    text: "Hide a screen from staff, or keep a field owner-only.",
  },
  {
    icon: ImageIcon,
    title: "Photos in the list",
    text: "A Photo or Image column becomes thumbs, cards, and the detail hero.",
  },
  {
    icon: Zap,
    title: "Action buttons",
    text: "Mark done, stamp the date, toast the owner. One tap on the record.",
  },
];

export function AppBuilderLanding() {
  return (
    <MarketingPage>
      <SiteHeader />
      <section className="ab-land-hero">
        <div className="ab-land-hero-inner mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-hero-copy">
            <p className="type-kicker text-sky-700">App Builder · on sheetomatic.com</p>
            <h1 className="minimal-hero-title">
              A phone app on your Google Sheet. Try here first.
            </h1>
            <p className="minimal-hero-lead">
              Free Gmail is enough. Paste the Sheet, speak what you need, use
              free credits. Staff do not need Google. We never send you to the
              Workspace Marketplace.
            </p>
            <div className="ab-land-actions">
              <Link className={marketingButtonClass("primary")} href="/app-builder/signup">
                Sign up
              </Link>
              <a className={marketingButtonClass("secondary")} href={APP_BUILDER_STUDIO_HREF}>
                Try App Builder
              </a>
              <a className={marketingButtonClass("secondary")} href={APP_BUILDER_LOGIN_HREF}>
                Sign in
              </a>
            </div>
            <p className="ab-land-note">
              Google only sees Sheets you create or open here.{" "}
              <Link href="/app-builder/privacy">How we use your Sheet</Link>.
            </p>
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="ab-land-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-head">
            <p className="type-kicker text-sky-700">How it works</p>
            <h2>Connect. Preview the phone. Pay when it works.</h2>
          </div>
          <ol className="ab-land-steps">
            {steps.map((step) => (
              <li className="ab-land-card" key={step.n}>
                <em>{step.n}</em>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ab-land-section soft">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-head">
            <p className="type-kicker text-sky-700">On the phone</p>
            <h2>The Glide pieces owners actually ask for.</h2>
            <p>
              Screens come from your tabs. Relations, lookups, and buttons sit
              on top — without formulas in the Sheet.
            </p>
          </div>
          <div className="ab-land-feats">
            {extras.map((item) => {
              const Icon = item.icon;
              return (
                <article className="ab-land-feat" key={item.title}>
                  <Icon size={22} aria-hidden />
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}

function PhonePreview() {
  return (
    <aside className="ab-phone" aria-label="Phone preview of an orders app">
      <div className="ab-phone-bar">
        <span>9:41</span>
        <strong>Sheetomatic</strong>
        <span>LTE</span>
      </div>
      <p className="ab-phone-kicker">Good morning</p>
      <h3>Orders Desk</h3>
      <div className="ab-phone-tiles">
        <span>
          <em>3</em>
          <i>Orders</i>
        </span>
        <span>
          <em>2</em>
          <i>Parties</i>
        </span>
      </div>
      <div className="ab-phone-list">
        <div className="ab-phone-row">
          <span className="ab-phone-av" style={{ background: "#1d4ed8" }}>
            SM
          </span>
          <div>
            <strong>SO-1001</strong>
            <small>SM Traders · ₹1,25,000</small>
          </div>
          <span className="ab-phone-chip">Open</span>
        </div>
        <div className="ab-phone-row">
          <span className="ab-phone-av" style={{ background: "#0f766e" }}>
            ES
          </span>
          <div>
            <strong>SO-1002</strong>
            <small>East Steel · ₹84,000</small>
          </div>
          <span className="ab-phone-chip ok">Dispatched</span>
        </div>
        <div className="ab-phone-row">
          <span className="ab-phone-av" style={{ background: "#7c3aed" }}>
            SM
          </span>
          <div>
            <strong>SO-1003</strong>
            <small>SM Traders · ₹52,000</small>
          </div>
          <span className="ab-phone-chip">Open</span>
        </div>
      </div>
      <div className="ab-phone-nav">
        <em>Home</em>
        <span>Orders</span>
        <span>Parties</span>
      </div>
    </aside>
  );
}
