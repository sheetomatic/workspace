import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { AiSiteFooter, AiSiteHeader } from "@/components/marketing/ai-site-chrome";
import { AI_LOGIN_HREF, AI_START_FREE_HREF } from "@/lib/ai-auth-links";
import { pricingEnquireFaqs, pricingEnquireIncludes } from "@/app/product-content";
import { buildWhatsAppUrl } from "@/app/site-content";
import "./wa-product.css";

const ENQUIRE_MESSAGE =
  "Hi Sheetomatic, I would like to know about pricing for Task + WhatsApp Messages for my team. Please share plan options.";

export function AiPricingEnquirePage() {
  const enquireHref = buildWhatsAppUrl(ENQUIRE_MESSAGE);

  return (
    <main className="marketing-page marketing-site wa-product-page wa-pricing-sweet">
      <AiSiteHeader />

      <section className="wa-pricing-sweet-hero">
        <div className="wa-product-container">
          <div className="wa-pricing-sweet-hero-inner">
            <span className="wa-product-kicker">
              <Sparkles size={14} aria-hidden />
              Plans for every team
            </span>
            <h1>Pricing that fits how your team works</h1>
            <p className="wa-pricing-sweet-lead">
              Every business is a little different. Tell us your team size and how you
              use WhatsApp, and we will share a clear quote with no surprises.
            </p>
            <p className="wa-pricing-workspace-crosslink">
              Looking for Workspace / EM Ready plans?{" "}
              <Link href="/pricing">See EM Ready pricing</Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Enquire about pricing" className="wa-pricing-sweet-main">
        <div className="wa-product-container">
          <div className="wa-pricing-sweet-grid">
            <div className="wa-pricing-sweet-copy">
              <h2>Task + WhatsApp Messages</h2>
              <p>
                Delegate work by voice or text, notify assignees on WhatsApp, and track
                everything in your web workspace. Built for owner-led MSME teams.
              </p>
              <ul className="wa-pricing-sweet-includes">
                {pricingEnquireIncludes.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={17} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="wa-pricing-enquire-card">
              <span className="wa-pricing-enquire-icon" aria-hidden>
                <HeartHandshake size={22} />
              </span>
              <p className="wa-pricing-enquire-kicker">We would love to help</p>
              <h3>Enquire about pricing</h3>
              <p className="wa-pricing-enquire-text">
                A quick chat on WhatsApp is all it takes. We will understand your team,
                share a tailored quote, and walk you through setup.
              </p>
              <a
                className="wa-btn-primary wa-pricing-enquire-btn"
                href={enquireHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle size={17} aria-hidden />
                Chat on WhatsApp
                <ArrowRight size={16} aria-hidden />
              </a>
              <Link className="wa-pricing-enquire-secondary" href="/contact">
                Or send a message from our contact page
              </Link>
              <div className="wa-pricing-enquire-divider" />
              <p className="wa-pricing-enquire-free">Want to explore first?</p>
              <Link
                className="wa-btn-secondary wa-pricing-enquire-free-btn"
                href={AI_START_FREE_HREF}
              >
                Start free workspace
              </Link>
              <Link className="wa-pricing-signin-link" href={AI_LOGIN_HREF}>
                Already have an account? <strong>Sign in</strong>
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="wa-pricing-sweet-faq">
        <div className="wa-product-container">
          <div className="wa-pricing-sweet-faq-head">
            <span className="wa-product-kicker">Good to know</span>
            <h2>Questions before you enquire</h2>
          </div>
          <div className="wa-pricing-sweet-faq-list">
            {pricingEnquireFaqs.map((item) => (
              <article className="wa-pricing-sweet-faq-item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AiSiteFooter />
    </main>
  );
}
