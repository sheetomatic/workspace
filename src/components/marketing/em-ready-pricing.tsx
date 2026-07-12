"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import {
  emReadyContactOffer,
  emReadyPricingFootnotes,
  emReadyPublicPlans,
  formatInr,
  getEmReadyDisplayPrice,
  hasEmReadyAnnualPricing,
  type EmReadyBillingPeriod,
  type EmReadyPlan,
} from "@/app/em-ready-plans";
import { buildWhatsAppUrl } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import "./em-ready-pricing.css";

function enquireMessage(plan: EmReadyPlan): string {
  return `Hi Sheetomatic, I am interested in ${plan.name} (${plan.includedUsers} users). Please share next steps for EM Ready Workspace.`;
}

const CONTACT_50_PLUS_MESSAGE =
  "Hi Sheetomatic, we need EM Ready Workspace for more than 50 users. Please share a custom quote.";

function PlanCard({
  plan,
  period,
}: {
  plan: EmReadyPlan;
  period: EmReadyBillingPeriod;
}) {
  const price = getEmReadyDisplayPrice(plan, period);
  const whatsappHref = buildWhatsAppUrl(enquireMessage(plan));
  const isStarter = plan.id === "em_ready_starter";
  const isScale = plan.id === "em_ready_scale";

  return (
    <article
      className={`em-plan-card${isStarter ? " is-starter" : ""}${isScale ? " is-scale" : ""}`}
    >
      {plan.badge ? <span className="em-plan-badge">{plan.badge}</span> : null}
      <h2 className="em-plan-name">{plan.shortName}</h2>
      <p className="em-plan-tagline">{plan.tagline}</p>

      <div className="em-plan-price-block">
        <p className="em-plan-price">
          <span>{price.amountLabel}</span>
          {price.periodLabel ? (
            <span className="em-plan-price-period">{price.periodLabel}</span>
          ) : null}
        </p>
        {price.annualNote ? (
          <p className="em-plan-price-note">{price.annualNote}</p>
        ) : null}
      </div>

      <ul className="em-plan-meta">
        <li>
          <span>Users included</span>
          <span>{plan.includedUsers}</span>
        </li>
        <li>
          <span>Extra seat</span>
          <span>
            {plan.extraUserMonthlyInr != null
              ? `${formatInr(plan.extraUserMonthlyInr)}/mo`
              : "—"}
          </span>
        </li>
        <li>
          <span>FMS templates</span>
          <span>Up to {plan.maxFmsTemplates}</span>
        </li>
        <li>
          <span>Storage</span>
          <span>{plan.storageGb} GB</span>
        </li>
      </ul>

      <div className="em-plan-modules" aria-label="Included modules">
        {plan.modules.map((mod) => (
          <span className="em-plan-module" key={mod}>
            {mod}
          </span>
        ))}
      </div>

      <ul className="em-plan-highlights">
        {plan.highlights.map((item) => (
          <li key={item}>
            <CheckCircle2 size={16} aria-hidden />
            {item}
          </li>
        ))}
      </ul>

      <div className="em-plan-actions">
        <a
          className="btn-cta"
          href={whatsappHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle size={16} aria-hidden />
          Chat on WhatsApp
        </a>
        <div className="em-plan-actions-secondary">
          <Link href="/contact">Contact us</Link>
          <Link href={WORKSPACE_LOGIN_HREF}>Workspace login</Link>
        </div>
      </div>
    </article>
  );
}

export function EmReadyPricing() {
  const showAnnual = hasEmReadyAnnualPricing();
  const [period, setPeriod] = useState<EmReadyBillingPeriod>("monthly");
  const contactHref = buildWhatsAppUrl(CONTACT_50_PLUS_MESSAGE);

  return (
    <div className="em-pricing-page">
      <section className="em-pricing-hero">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="em-pricing-hero-inner">
            <p className="em-pricing-kicker">EM Ready Workspace</p>
            <h1>Plans for owners who run ops one day a week</h1>
            <p className="em-pricing-lead">
              FMS, tasks, checklists, and person-wise KRA/KPI — live for Monday EM.
              Minimum plan starts at Starter (8 users). Monthly billing; annual where
              listed.
            </p>
          </div>
        </div>
      </section>

      <section className="em-pricing-section" aria-label="EM Ready plans">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {showAnnual ? (
            <div className="em-pricing-toolbar">
              <div
                className="em-pricing-toggle"
                role="group"
                aria-label="Billing period"
              >
                <button
                  type="button"
                  aria-pressed={period === "monthly"}
                  onClick={() => setPeriod("monthly")}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={period === "annual"}
                  onClick={() => setPeriod("annual")}
                >
                  Annual
                </button>
              </div>
              <p className="em-pricing-toggle-hint">
                Recover every month · annual saves vs paying month-to-month
              </p>
            </div>
          ) : null}

          <div className="em-pricing-grid">
            {emReadyPublicPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} period={period} />
            ))}
          </div>

          <aside className="em-contact-band" aria-labelledby="em-contact-50-title">
            <div>
              <h2 id="em-contact-50-title">{emReadyContactOffer.title}</h2>
              <p>{emReadyContactOffer.tagline}</p>
              <ul>
                {emReadyContactOffer.highlights.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="em-contact-actions">
              <a
                className="btn-cta"
                href={contactHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle size={16} aria-hidden />
                Contact us on WhatsApp
              </a>
              <Link className="btn-cta btn-secondary" href="/contact">
                Send a message
              </Link>
            </div>
          </aside>

          <ul className="em-pricing-footnotes">
            {emReadyPricingFootnotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <p className="em-pricing-workspace-note">
            Already a customer?{" "}
            <Link href={WORKSPACE_LOGIN_HREF}>Sign in to Workspace</Link>
          </p>
          <p className="em-pricing-ai-link">
            Looking for Sheetomatic AI (WhatsApp) plans?{" "}
            <Link href="/ai/pricing">See AI pricing</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
