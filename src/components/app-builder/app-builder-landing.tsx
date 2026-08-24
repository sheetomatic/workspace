import Link from "next/link";
import { EyeOff, ImageIcon, Sigma, Zap } from "lucide-react";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { TEMPLATES } from "@/lib/app-builder";
import { APP_BUILDER_LOGIN_HREF, APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";
import {
  AppBuilderHeroSplit,
  TEMPLATE_LEAD,
} from "./app-builder-hero-split";
import { GlidePhonePreview } from "./glide-phone-preview";
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
  const featured = TEMPLATES.find((t) => t.id === "orders");

  return (
    <MarketingPage>
      <SiteHeader />
      <AppBuilderHeroSplit
        featured
        kicker="App Builder"
        titleAs="h1"
        title={
          <>
            Your Sheet.
            <br />
            A phone app.
          </>
        }
        lead="On Google Workspace. Staff open a link and PIN — no extra seat, no Marketplace."
        facts={["Google Workspace", "40 free credits", "PIN for staff"]}
        plan={featured}
        actions={
          <>
            <Link className="ab-ios-btn ab-ios-btn-fill" href="/app-builder/signup">
              Get
            </Link>
            <a className="ab-ios-btn ab-ios-btn-tint" href={APP_BUILDER_STUDIO_HREF}>
              Try
            </a>
          </>
        }
        note={
          <>
            <Link href="/app-builder/privacy">How we use your Sheet</Link>
            <span aria-hidden> · </span>
            <a href={APP_BUILDER_LOGIN_HREF}>Sign in</a>
          </>
        }
      />

      <section className="ab-land-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-head">
            <p className="type-kicker text-sky-700">Templates</p>
            <h2>Same phone app. One Sheet each.</h2>
            <p>
              Orders, CRM, inventory, attendance — each template is a phone
              home, not a spreadsheet thumbnail.
            </p>
          </div>
          <div className="ab-land-templates">
            {TEMPLATES.filter((plan) => plan.id !== "orders").map((plan) => (
              <article className="ab-land-template" id={`tpl-${plan.id}`} key={plan.id}>
                <GlidePhonePreview plan={plan} />
                <strong>{plan.label}</strong>
                <p>{TEMPLATE_LEAD[plan.id] || plan.blurb}</p>
              </article>
            ))}
          </div>
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
