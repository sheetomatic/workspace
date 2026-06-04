import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import type { ProductFeature, PricingPlan } from "@/app/product-content";
import { AI_LOGIN_HREF, AI_START_FREE_HREF } from "@/lib/ai-auth-links";
import { buildWhatsAppUrl } from "@/app/site-content";
import {
  aiFullAccessPlans,
  aiEnterpriseContact,
  chatbotPage,
  crmPage,
  dashboardNavPreview,
  formatInr,
  getTaskPlanPriceLabel,
  industryUseCases,
  launchSteps,
  pricingFootnotes,
  pricingSection,
  pricingTiers,
  productFaqs,
  pricingPageFaqs,
  productFeatures,
  productHome,
  taskWhatsappPlans,
  testimonials,
  trustedBy,
} from "@/app/product-content";
import "./wa-product.css";

export function WaProductHero({
  eyebrow = productHome.eyebrow,
  title = productHome.title,
  lead = productHome.lead,
  primaryHref = AI_START_FREE_HREF,
  primaryLabel = productHome.primaryCta,
  secondaryHref = AI_LOGIN_HREF,
  secondaryLabel = productHome.secondaryCta,
  showTrusted = true,
  showMockup = true,
}: {
  eyebrow?: string;
  title?: string;
  lead?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  showTrusted?: boolean;
  showMockup?: boolean;
}) {
  return (
    <section className="wa-product-hero">
      <div className="wa-product-container">
        <div className="wa-product-hero-grid">
          <div>
            <span className="wa-product-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="wa-product-hero-lead">{lead}</p>
            <div className="wa-product-hero-actions">
              <Link className="wa-btn-primary" href={primaryHref}>
                {primaryLabel}
              </Link>
              <Link className="wa-btn-secondary" href={secondaryHref}>
                {secondaryLabel}
              </Link>
              <Link className="wa-hero-features-link" href="/ai#features">
                <Sparkles size={16} aria-hidden />
                Experience AI
              </Link>
            </div>
            {showTrusted ? (
              <div className="wa-trusted-strip" aria-label="Trusted by">
                {trustedBy.map((label) => (
                  <span className="wa-trusted-pill" key={label}>
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {showMockup ? <WaDashboardMockup /> : null}
        </div>
      </div>
    </section>
  );
}

export function WaDashboardMockup() {
  return (
    <div className="wa-mockup-shell" aria-hidden>
      <div className="wa-mockup-topbar">
        <span>Sheetomatic AI Workspace</span>
        <span style={{ color: "#18a957" }}>AI Live</span>
      </div>
      <div className="wa-mockup-body">
        <div className="wa-mockup-nav">
          {dashboardNavPreview.slice(0, 6).map((item, index) => (
            <span className={index === 1 ? "is-active" : ""} key={item.label}>
              {item.label}
            </span>
          ))}
        </div>
        <div className="wa-mockup-main">
          <div className="wa-mockup-metrics">
            <div className="wa-metric-card">
              <strong>128</strong>
              <span>Chats today</span>
            </div>
            <div className="wa-metric-card">
              <strong>94%</strong>
              <span>AI resolved</span>
            </div>
            <div className="wa-metric-card">
              <strong>18</strong>
              <span>Hot leads</span>
            </div>
          </div>
          <WaChatPreview compact />
        </div>
      </div>
    </div>
  );
}

export function WaChatPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="wa-chat-panel">
      <div className="wa-chat-bubble inbound">
        Hi, I need pricing for your automation package.
      </div>
      <div className="wa-chat-bubble ai outbound">
        <span className="wa-chat-ai-tag">
          <Bot size={10} aria-hidden /> AI - 96% confidence
        </span>
        Hello! Message us for Task plan pricing. For AI full
        access, contact us for enterprise plans.
      </div>
      {!compact ? (
        <>
          <div className="wa-chat-bubble inbound">Yes, tomorrow 11 AM works.</div>
          <div className="wa-chat-bubble outbound">
            Booked. Our team will confirm on WhatsApp shortly.
          </div>
        </>
      ) : null}
    </div>
  );
}

export function WaFeatureGrid({
  features = productFeatures,
  title = "Everything you need to automate WhatsApp",
  lead = "One platform for AI replies, CRM, inbox, workflows, and team collaboration.",
}: {
  features?: ProductFeature[];
  title?: string;
  lead?: string;
}) {
  return (
    <section className="wa-section" id="features">
      <div className="wa-product-container">
        <div className="wa-section-head">
          <span className="wa-product-kicker">Platform features</span>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <div className="wa-feature-grid">
          {features.map(({ icon: Icon, title: featureTitle, text }) => (
            <article className="wa-feature-card" key={featureTitle}>
              <span className="wa-feature-icon">
                <Icon size={18} aria-hidden />
              </span>
              <h3>{featureTitle}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WaLaunchSteps() {
  return (
    <section className="wa-section soft">
      <div className="wa-product-container">
        <div className="wa-section-head">
          <span className="wa-product-kicker">Launch in 5 minutes</span>
          <h2>Go live without a technical team</h2>
          <p>Sign up, train your AI, and start answering customers on WhatsApp.</p>
        </div>
        <div className="wa-steps-grid">
          {launchSteps.map((step) => (
            <article className="wa-step-card" key={step.title}>
              <span className="wa-step-num">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WaIndustriesSection() {
  return (
    <section className="wa-section">
      <div className="wa-product-container">
        <div className="wa-section-head">
          <span className="wa-product-kicker">Industries</span>
          <h2>Built for WhatsApp-first businesses</h2>
          <p>Adapt the same AI brain to your industry workflows and customer journeys.</p>
        </div>
        <div className="wa-industry-grid">
          {industryUseCases.map((item) => (
            <article className="wa-industry-card" key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.text}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WaTestimonialsSection() {
  return (
    <section className="wa-section soft">
      <div className="wa-product-container">
        <div className="wa-section-head">
          <span className="wa-product-kicker">Customer stories</span>
          <h2>Teams convert more with always-on WhatsApp AI</h2>
        </div>
        <div className="wa-testimonial-grid">
          {testimonials.map((item) => (
            <figure className="wa-testimonial-card" key={item.name}>
              <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WaFaqSection({
  faqs = productFaqs,
  title = "Common questions",
}: {
  faqs?: Array<{ q: string; a: string }>;
  title?: string;
}) {
  return (
    <section className="wa-section" id="faq">
      <div className="wa-product-container">
        <div className="wa-section-head">
          <span className="wa-product-kicker">FAQ</span>
          <h2>{title}</h2>
        </div>
        <div className="wa-faq-list">
          {faqs.map((item) => (
            <article className="wa-faq-item" key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function pricingPlanHref(plan: PricingPlan) {
  if (plan.ctaType === "signup") {
    return AI_START_FREE_HREF;
  }
  if (plan.ctaType === "contact") {
    return "/contact";
  }
  return buildWhatsAppUrl(
    plan.whatsappMessage ??
      `Hi Sheetomatic, I am interested in the ${plan.name} plan for WhatsApp AI.`,
  );
}

function PricingPlanPrice({ plan }: { plan: PricingPlan }) {
  if (plan.customLabel) {
    return (
      <p className="wa-pricing-price">
        {plan.customLabel}
        <small>tailored quote</small>
      </p>
    );
  }

  if (plan.perUserAnnualInr != null) {
    return (
      <>
        <p className="wa-pricing-price">
          {formatInr(plan.perUserAnnualInr)}
          <small>/ user / year</small>
        </p>
        {plan.setupFeeInr ? (
          <p className="wa-pricing-annual">
            + {formatInr(plan.setupFeeInr)} one-time setup
          </p>
        ) : null}
      </>
    );
  }

  if (plan.monthlyInr === 0) {
    return (
      <p className="wa-pricing-price">
        {formatInr(0)}
        <small>{plan.trialDays ? `${plan.trialDays}-day pilot` : "pilot"}</small>
      </p>
    );
  }

  if (plan.monthlyInr == null) {
    return null;
  }

  return (
    <>
      <p className="wa-pricing-price">
        {formatInr(plan.monthlyInr)}
        <small>/ month · org</small>
      </p>
      {plan.annualInr ? (
        <p className="wa-pricing-annual">
          or {formatInr(plan.annualInr)}/year
          <span> · 2 months free</span>
        </p>
      ) : null}
    </>
  );
}

function PricingPlanCta({ plan }: { plan: PricingPlan }) {
  const href = pricingPlanHref(plan);
  const className = plan.featured ? "wa-btn-primary" : "wa-btn-secondary";
  const isExternal = plan.ctaType === "whatsapp";

  if (isExternal) {
    return (
      <a
        className={className}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {plan.cta}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {plan.cta}
    </Link>
  );
}

export function WaPricingFootnotes() {
  return (
    <ul className="wa-pricing-footnotes">
      {pricingFootnotes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

export function WaPricingGrid({ plans }: { plans: PricingPlan[] }) {
  const single = plans.length === 1;
  return (
    <div className={`wa-pricing-grid${single ? " is-single" : ""}`}>
      {plans.map((plan) => (
        <article
          className={`wa-pricing-card${plan.featured ? " featured" : ""}`}
          key={`${plan.tier}-${plan.name}`}
        >
          {plan.badge ? <span className="wa-pricing-badge">{plan.badge}</span> : null}
          <h3>{plan.name}</h3>
          <PricingPlanPrice plan={plan} />
          <p>{plan.description}</p>
          <ul>
            {plan.limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
          <PricingPlanCta plan={plan} />
        </article>
      ))}
    </div>
  );
}

function WaPricingEnterprisePanel() {
  return (
    <div className="wa-pricing-enterprise">
      <div className="wa-pricing-enterprise-copy">
        <h4>{aiEnterpriseContact.title}</h4>
        <p>{aiEnterpriseContact.lead}</p>
        <ul>
          {aiEnterpriseContact.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
      <div className="wa-pricing-enterprise-actions">
        <a
          className="wa-btn-primary"
          href={buildWhatsAppUrl(aiEnterpriseContact.whatsappMessage)}
          rel="noopener noreferrer"
          target="_blank"
        >
          {aiEnterpriseContact.cta}
        </a>
        <Link className="wa-btn-secondary" href="/contact">
          Contact page
        </Link>
      </div>
    </div>
  );
}

function WaPricingTierBlock({
  kicker,
  title,
  subcopy,
  plans,
  anchor,
  contactOnly = false,
}: {
  kicker: string;
  title: string;
  subcopy: string;
  plans: PricingPlan[];
  anchor: string;
  contactOnly?: boolean;
}) {
  return (
    <div className="wa-pricing-tier" id={anchor}>
      <div className="wa-pricing-tier-head">
        <span className="wa-product-kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{subcopy}</p>
      </div>
      {contactOnly ? <WaPricingEnterprisePanel /> : <WaPricingGrid plans={plans} />}
    </div>
  );
}

export function WaPricingSection({
  title = pricingSection.title,
  subcopy = pricingSection.subcopy,
  showSectionHead = true,
}: {
  title?: string;
  subcopy?: string;
  showSectionHead?: boolean;
}) {
  return (
    <section className="wa-section" id="pricing">
      <div className="wa-product-container">
        {showSectionHead ? (
          <div className="wa-section-head">
            <span className="wa-product-kicker">{pricingSection.eyebrow}</span>
            <h2>{title}</h2>
            <p>{subcopy}</p>
          </div>
        ) : null}
        <WaPricingTierBlock
          anchor={pricingTiers.taskWhatsapp.anchor}
          kicker={pricingTiers.taskWhatsapp.kicker}
          plans={taskWhatsappPlans}
          subcopy={pricingTiers.taskWhatsapp.subcopy}
          title={pricingTiers.taskWhatsapp.title}
        />
        <WaPricingFootnotes />
      </div>
    </section>
  );
}

export function WaChatbotPageContent() {
  return (
    <>
      <WaProductHero
        eyebrow={chatbotPage.eyebrow}
        title={chatbotPage.title}
        lead={chatbotPage.lead}
        primaryLabel={chatbotPage.cta}
        primaryHref={AI_START_FREE_HREF}
        secondaryLabel="See pricing"
        secondaryHref="/ai/pricing"
        showTrusted={false}
        showMockup={false}
      />
      <section className="wa-section soft">
        <div className="wa-product-container wa-split-showcase">
          <div>
            <div className="wa-section-head">
              <span className="wa-product-kicker">Use cases</span>
              <h2>AI that handles real business conversations</h2>
              <p>
                Train once on your FAQs and documents. The bot answers instantly
                and escalates complex cases to your team.
              </p>
            </div>
            <ul className="wa-use-case-list">
              {chatbotPage.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="wa-product-hero-actions">
              <Link className="wa-btn-primary" href={AI_START_FREE_HREF}>
                {chatbotPage.cta}
              </Link>
              <Link className="wa-btn-secondary" href={AI_LOGIN_HREF}>
                Log in
              </Link>
            </div>
          </div>
          <WaChatPreview />
        </div>
      </section>
    </>
  );
}

export function WaCrmMockup() {
  return (
    <div className="wa-crm-mock" aria-hidden>
      <div className="wa-crm-mock-head">Team Inbox - 12 open conversations</div>
      <div className="wa-crm-mock-body">
        <div className="wa-crm-col">
          <div className="wa-crm-thread-item is-active">
            <strong>Rahul - Pricing</strong>
            <div>Intent: Sales - 2m ago</div>
          </div>
          <div className="wa-crm-thread-item">
            <strong>Anita - Order #4821</strong>
            <div>Intent: Support - 8m ago</div>
          </div>
          <div className="wa-crm-thread-item">
            <strong>Vikram - Demo</strong>
            <div>Intent: Booking - 14m ago</div>
          </div>
        </div>
        <div className="wa-crm-col">
          <WaChatPreview compact />
        </div>
        <div className="wa-crm-col">
          <div className="wa-crm-detail-row">
            <span>Contact</span>
            <strong>Rahul Mehta</strong>
          </div>
          <div className="wa-crm-detail-row">
            <span>Tags</span>
            <strong>Hot lead, Pricing</strong>
          </div>
          <div className="wa-crm-detail-row">
            <span>AI status</span>
            <strong>Human takeover off</strong>
          </div>
          <div className="wa-crm-detail-row">
            <span>Source</span>
            <strong>WhatsApp campaign</strong>
          </div>
          <div className="wa-crm-detail-row">
            <span>Notes</span>
            <strong>Interested in AI Growth plan</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WaCrmPageContent() {
  return (
    <>
      <WaProductHero
        eyebrow={crmPage.eyebrow}
        title={crmPage.title}
        lead={crmPage.lead}
        primaryLabel={crmPage.cta}
        primaryHref="/ai/app/inbox"
        secondaryLabel="Train AI"
        secondaryHref={AI_LOGIN_HREF}
        showTrusted={false}
        showMockup={false}
      />
      <section className="wa-section soft">
        <div className="wa-product-container">
          <div className="wa-section-head">
            <span className="wa-product-kicker">Inbox preview</span>
            <h2>Split inbox built for WhatsApp teams</h2>
            <p>Conversations on the left, chat in the center, contact context on the right.</p>
          </div>
          <WaCrmMockup />
        </div>
      </section>
      <WaFeatureGrid
        features={productFeatures.filter((item) =>
          ["WhatsApp CRM", "Team Inbox", "Contacts & Leads", "Tickets", "Human Handoff"].includes(
            item.title,
          ),
        )}
        title="CRM features your support team will actually use"
        lead="Assign, tag, note, and track every WhatsApp lead without switching tools."
      />
    </>
  );
}

export function WaProductCta() {
  return (
    <section className="wa-section soft">
      <div className="wa-product-container" style={{ textAlign: "center" }}>
        <span className="wa-product-kicker">Ready to go live?</span>
        <h2 style={{ marginTop: "0.75rem", fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
          Start free and connect WhatsApp in minutes
        </h2>
        <p style={{ color: "#64748b", maxWidth: "36rem", margin: "0.75rem auto 0" }}>
          Experience AI replies, team inbox, and CRM in one workspace built for Indian MSMEs.
        </p>
        <div
          className="wa-product-hero-actions"
          style={{ justifyContent: "center", marginTop: "1.25rem" }}
        >
          <Link className="wa-btn-primary" href={AI_START_FREE_HREF}>
            Start Free
          </Link>
          <Link className="wa-btn-secondary" href={AI_LOGIN_HREF}>
            Log in
          </Link>
          <Link className="wa-btn-secondary" href="/contact">
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
