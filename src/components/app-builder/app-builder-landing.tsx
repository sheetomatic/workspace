import Link from "next/link";
import { EyeOff, ImageIcon, Sigma, Zap } from "lucide-react";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import {
  APP_BUILDER_USP_LINE,
  APP_BUILDER_USP_PILLARS,
  APP_BUILDER_USP_ROWS,
  APP_BUILDER_USP_WHY,
  TEMPLATES,
} from "@/lib/app-builder";
import { APP_BUILDER_LOGIN_HREF, APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";
import { AppBuilderHeroSplit } from "./app-builder-hero-split";
import { TemplateNamePicker } from "./template-name-picker";
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
            AppSheet power.
            <br />
            Glide screens.
          </>
        }
        lead={APP_BUILDER_USP_WHY}
        facts={["Gmail Sheet", "PIN for staff", "Phone · tablet · desktop"]}
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
              Click a template name to preview the phone. Then get it or buy.
            </p>
          </div>
          <TemplateNamePicker templates={TEMPLATES} />
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

      <section className="ab-land-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-head">
            <p className="type-kicker text-sky-700">Why us</p>
            <h2>{APP_BUILDER_USP_LINE}</h2>
            <p>
              AppSheet is powerful and ugly. Glide is beautiful and thin. We
              ship the combination owners actually buy — on a Gmail Sheet.
            </p>
          </div>
          <div className="ab-land-pillars">
            {APP_BUILDER_USP_PILLARS.map((pillar) => (
              <article className={`ab-land-card is-${pillar.id}`} key={pillar.id}>
                <em>{pillar.id === "us" ? "USP" : pillar.id}</em>
                <strong>{pillar.title}</strong>
                <ul>
                  {pillar.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="ab-land-compare-wrap">
            <table className="ab-land-compare">
              <caption>What we take from AppSheet and Glide</caption>
              <thead>
                <tr>
                  <th scope="col">Need</th>
                  <th scope="col">AppSheet</th>
                  <th scope="col">Glide</th>
                  <th scope="col">Sheetomatic</th>
                </tr>
              </thead>
              <tbody>
                {APP_BUILDER_USP_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td>{row.appsheet}</td>
                    <td>{row.glide}</td>
                    <td>{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ab-land-section soft">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="ab-land-head">
            <p className="type-kicker text-sky-700">On every device</p>
            <h2>Glide look. AppSheet depth.</h2>
            <p>
              Screens come from your tabs. Formulas, bots, and buttons sit on
              top — without IMPORTRANGE in the Sheet.
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
