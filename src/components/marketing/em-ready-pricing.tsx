"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Columns2, Minus } from "lucide-react";
import {
  emReadyCompareRows,
  emReadyContactOffer,
  emReadyCustomApps,
  emReadyModulePlans,
  emReadyPricingFootnotes,
  emReadyPublicModulePlans,
  emReadyPublicPlans,
  emReadySheetsPitch,
  emReadyWorkspaceBuild,
  formatInr,
  getEmReadyDisplayPrice,
  getEmReadyModuleDisplayPrice,
  hasEmReadyAnnualPricing,
  sumSelectedModulesMonthly,
  type EmReadyBillingPeriod,
  type EmReadyModulePlan,
  type EmReadyModulePlanId,
  type EmReadyPlan,
} from "@/app/em-ready-plans";
import { buildWhatsAppUrl } from "@/app/site-content";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { WhatsAppIcon } from "@/components/marketing/marketing-icons";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import "./em-ready-pricing.css";

type PricingPath = "suite" | "modules";

function enquireSuiteMessage(plan: EmReadyPlan): string {
  return `Hi Sheetomatic, I am interested in ${plan.name} Suite (${plan.includedUsers} users). Please share next steps.`;
}

function enquireModuleMessage(plan: EmReadyModulePlan): string {
  const seat =
    plan.id === "module_whatsapp" || plan.id === "module_hr"
      ? `base ${formatInr(plan.priceMonthlyInr)}/mo + ${formatInr(plan.extraUserMonthlyInr)}/user`
      : `${plan.includedUsers} users`;
  return `Hi Sheetomatic, I am interested in the ${plan.name} module (${seat}). Please share next steps.`;
}

const CONTACT_50_PLUS_MESSAGE =
  "Hi Sheetomatic, we need EM Ready Workspace for more than 50 users. Please share a custom quote.";

const IMPLEMENTATION_ASK_MESSAGE =
  "Hi Sheetomatic, I want to understand the additional implementation cost for our business — FMS, Check Lists, and related modules. Please share a quote.";

const CUSTOM_APPS_ASK_MESSAGE =
  "Hi Sheetomatic, we need Google Workspace Apps or AppSheet built for our process. Please share next steps.";

function PriceBlock({
  amountLabel,
  periodLabel,
  annualNote,
}: {
  amountLabel: string;
  periodLabel: string;
  annualNote: string | null;
}) {
  return (
    <div className="em-plan-price-block">
      <p className="em-plan-price">
        {amountLabel.startsWith("₹") ? (
          <>
            <span className="em-plan-currency">₹</span>
            <span>{amountLabel.replace(/^₹\s*/, "")}</span>
          </>
        ) : (
          <span>{amountLabel}</span>
        )}
        {periodLabel ? (
          <span className="em-plan-price-period">{periodLabel}</span>
        ) : null}
      </p>
      {annualNote ? <p className="em-plan-price-note">{annualNote}</p> : null}
    </div>
  );
}

function suiteAdds(plan: EmReadyPlan) {
  if (plan.id === "em_ready_growth") {
    return { label: "All of Starter, and", items: ["Check Lists", "Tasks"] };
  }
  if (plan.id === "em_ready_scale") {
    return { label: "All of Growth, and", items: ["HRMS", "IMS"] };
  }
  return { label: "Starter includes", items: [...plan.modules] };
}

function PlanCard({
  plan,
  period,
}: {
  plan: EmReadyPlan;
  period: EmReadyBillingPeriod;
}) {
  const price = getEmReadyDisplayPrice(plan, period);
  const whatsappHref = buildWhatsAppUrl(enquireSuiteMessage(plan));
  const isStarter = plan.id === "em_ready_starter";
  const isScale = plan.id === "em_ready_scale";
  const adds = suiteAdds(plan);

  return (
    <article
      className={`em-plan-card em-suite-card${isStarter ? " is-starter" : ""}${isScale ? " is-scale" : ""}`}
    >
      <header className="em-suite-head">
        {plan.badge ? <span className="em-plan-badge">{plan.badge}</span> : null}
        <h2 className="em-plan-name">{plan.shortName}</h2>
        <p className="em-plan-tagline">{plan.tagline}</p>
      </header>

      <PriceBlock {...price} />

      <div className="em-plan-actions">
        <a
          className={marketingButtonClass("primary", "em-suite-cta")}
          href={whatsappHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Enquire
        </a>
      </div>

      <p className="em-suite-includes-label">{adds.label}</p>
      <ul className="em-suite-includes">
        {adds.items.map((item) => (
          <li key={item}>
            <CheckCircle2 size={15} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <p className="em-suite-seat">
        {plan.includedUsers} users · {plan.maxFmsTemplates} FMS · {plan.storageGb} GB
      </p>
    </article>
  );
}

function ModuleCard({
  plan,
  period,
  selected,
  onToggleCompare,
}: {
  plan: EmReadyModulePlan;
  period: EmReadyBillingPeriod;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  const price = getEmReadyModuleDisplayPrice(plan, period);
  const whatsappHref = buildWhatsAppUrl(enquireModuleMessage(plan));

  return (
    <article className={`em-plan-card em-module-card${selected ? " is-selected" : ""}`}>
      {plan.badge ? <span className="em-plan-badge">{plan.badge}</span> : null}
      <p className="em-plan-path-label">Individual module</p>
      <h2 className="em-plan-name">{plan.shortName}</h2>
      <p className="em-plan-tagline">{plan.tagline}</p>

      <PriceBlock {...price} />

      <div className="em-plan-actions">
        <a
          className={marketingButtonClass("primary", "em-suite-cta")}
          href={whatsappHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Enquire
        </a>
      </div>

      <p className="em-suite-includes-label">Includes</p>
      <ul className="em-suite-includes">
        {plan.includes.map((item) => (
          <li key={item}>
            <CheckCircle2 size={15} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <p className="em-suite-seat">
        {plan.id === "module_hr"
          ? `${formatInr(plan.extraUserMonthlyInr)} per user`
          : `${plan.includedUsers} users`}
      </p>
      <button
        type="button"
        className={`em-compare-chip${selected ? " is-on" : ""}`}
        aria-pressed={selected}
        onClick={onToggleCompare}
      >
        {selected ? "In compare" : "Add to compare"}
      </button>
    </article>
  );
}

function ImplementationBand({ askHref }: { askHref: string }) {
  return (
    <aside
      className="em-build-band is-top"
      aria-labelledby="em-build-title"
    >
      <div>
        <p className="em-build-badge">Additional cost</p>
        <h2 id="em-build-title">{emReadyWorkspaceBuild.label}</h2>
        <p>{emReadyWorkspaceBuild.note}</p>
        <div className="em-build-actions">
          <a
            className={marketingButtonClass("whatsapp", "em-build-wa")}
            href={askHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="btn-cta-icon-wrap" aria-hidden>
              <WhatsAppIcon className="btn-cta-icon" size={18} strokeWidth={1.7} />
            </span>
            <span>Ask about implementation</span>
          </a>
          <Link
            className={marketingButtonClass("primary", "em-build-contact")}
            href="/contact"
          >
            Send a message
          </Link>
        </div>
      </div>
      <ul className="em-build-points">
        {emReadyWorkspaceBuild.points.map((item) => (
          <li key={item}>
            <CheckCircle2 size={16} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CustomAppsBand({ askHref }: { askHref: string }) {
  return (
    <aside className="em-build-band is-apps" aria-labelledby="em-apps-title">
      <div>
        <p className="em-build-badge">{emReadyCustomApps.badge}</p>
        <h2 id="em-apps-title">{emReadyCustomApps.label}</h2>
        <p>{emReadyCustomApps.note}</p>
        <div className="em-build-actions">
          <a
            className={marketingButtonClass("whatsapp", "em-build-wa")}
            href={askHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="btn-cta-icon-wrap" aria-hidden>
              <WhatsAppIcon className="btn-cta-icon" size={18} strokeWidth={1.7} />
            </span>
            <span>Ask about a custom build</span>
          </a>
          <Link
            className={marketingButtonClass("primary", "em-build-contact")}
            href="/contact"
          >
            Send a message
          </Link>
        </div>
      </div>
      <ul className="em-build-points">
        {emReadyCustomApps.points.map((item) => (
          <li key={item}>
            <CheckCircle2 size={16} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CompareSection({
  open,
  selectedModules,
  onClearModules,
}: {
  open: boolean;
  selectedModules: EmReadyModulePlanId[];
  onClearModules: () => void;
}) {
  const stackTotal = sumSelectedModulesMonthly(selectedModules);
  const selectedLabels = emReadyModulePlans
    .filter((m) => selectedModules.includes(m.id))
    .map((m) => m.shortName);

  if (!open) return null;

  return (
    <section
      id="em-pricing-compare"
      className="em-compare-section"
      aria-labelledby="em-compare-title"
    >
      <div className="em-compare-head">
        <div>
          <h2 id="em-compare-title">Compare Suite vs modules</h2>
          <p>
            ₹4,999 = FMS, EM, PC, MIS. ₹9,999 adds Check Lists + Tasks. ₹24,999
            adds HRMS + IMS. Buy one module if you only need that piece.
          </p>
        </div>
        {selectedModules.length > 0 ? (
          <div className="em-compare-stack">
            <p className="em-compare-stack-label">Your module stack</p>
            <p className="em-compare-stack-value">
              {formatInr(stackTotal)}
              <span>/mo</span>
            </p>
            <p className="em-compare-stack-mods">
              {selectedLabels.join(" + ")}
              {stackTotal > 4999 ? (
                <>
                  {" "}
                  · Starter Suite is {formatInr(4999)}/mo
                  {stackTotal > 9999 ? (
                    <> · Growth Suite is {formatInr(9999)}/mo</>
                  ) : null}
                </>
              ) : null}
            </p>
            <button type="button" className="em-compare-clear" onClick={onClearModules}>
              Clear selection
            </button>
          </div>
        ) : (
          <p className="em-compare-hint">
            Tip: open Modules and tap “Add to compare” to total a custom stack.
          </p>
        )}
      </div>

      <div className="em-compare-table-wrap">
        <table className="em-compare-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Suite Starter</th>
              <th scope="col">Suite Growth</th>
              <th scope="col">Suite Scale</th>
              <th scope="col">Buy modules</th>
            </tr>
          </thead>
          <tbody>
            {emReadyCompareRows.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td>{row.starter}</td>
                <td>{row.growth}</td>
                <td>{row.scale}</td>
                <td>{row.modules}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EmReadyPricing() {
  const showAnnual = hasEmReadyAnnualPricing();
  const [period, setPeriod] = useState<EmReadyBillingPeriod>("monthly");
  const [path, setPath] = useState<PricingPath>("suite");
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<EmReadyModulePlanId[]>(
    [],
  );
  const [scrollCompareToken, setScrollCompareToken] = useState(0);
  const pathGroupId = useId();
  const contactHref = buildWhatsAppUrl(CONTACT_50_PLUS_MESSAGE);
  const implementationAskHref = buildWhatsAppUrl(IMPLEMENTATION_ASK_MESSAGE);
  const customAppsAskHref = buildWhatsAppUrl(CUSTOM_APPS_ASK_MESSAGE);

  useEffect(() => {
    if (!compareOpen || scrollCompareToken === 0) return;
    const node = document.getElementById("em-pricing-compare");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [compareOpen, scrollCompareToken]);

  function toggleModule(id: EmReadyModulePlanId) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setCompareOpen(true);
  }

  function handleCompareClick() {
    if (compareOpen) {
      setCompareOpen(false);
      return;
    }
    setCompareOpen(true);
    setScrollCompareToken((n) => n + 1);
  }

  return (
    <div className="em-pricing-page">
      <section className="em-pricing-hero">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="em-pricing-hero-inner">
            <p className="em-pricing-kicker">{emReadySheetsPitch.kicker}</p>
            <h1>{emReadySheetsPitch.title}</h1>
            <p className="em-pricing-lead">{emReadySheetsPitch.lead}</p>
          </div>
        </div>
      </section>

      <section className="em-pricing-section" aria-label="EM Ready pricing">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="em-pricing-toolbar">
            <div
              className="em-pricing-toggle"
              role="group"
              aria-labelledby={pathGroupId}
            >
              <span id={pathGroupId} className="sr-only">
                Pricing path
              </span>
              <button
                type="button"
                aria-pressed={path === "suite"}
                onClick={() => setPath("suite")}
              >
                Suite
              </button>
              <button
                type="button"
                aria-pressed={path === "modules"}
                onClick={() => setPath("modules")}
              >
                Modules
              </button>
            </div>

            {showAnnual ? (
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
            ) : null}

            <button
              type="button"
              className={`em-compare-btn${compareOpen ? " is-open" : ""}`}
              aria-expanded={compareOpen}
              aria-controls="em-pricing-compare"
              onClick={handleCompareClick}
            >
              {compareOpen ? (
                <Minus size={16} aria-hidden />
              ) : (
                <Columns2 size={16} aria-hidden />
              )}
              {compareOpen ? "Hide compare" : "Compare"}
            </button>
          </div>

          {path === "suite" ? (
            <div className="em-pricing-grid">
              {emReadyPublicPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} period={period} />
              ))}
            </div>
          ) : (
            <div className="em-pricing-grid em-pricing-grid-modules">
              {emReadyPublicModulePlans.map((plan) => (
                <ModuleCard
                  key={plan.id}
                  plan={plan}
                  period={period}
                  selected={selectedModules.includes(plan.id)}
                  onToggleCompare={() => toggleModule(plan.id)}
                />
              ))}
            </div>
          )}

          <CompareSection
            open={compareOpen}
            selectedModules={selectedModules}
            onClearModules={() => setSelectedModules([])}
          />

          <ImplementationBand askHref={implementationAskHref} />
          <CustomAppsBand askHref={customAppsAskHref} />

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
                className={marketingButtonClass("whatsapp", "em-contact-wa")}
                href={contactHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="btn-cta-icon-wrap" aria-hidden>
                  <WhatsAppIcon className="btn-cta-icon" size={18} strokeWidth={1.7} />
                </span>
                <span>Contact us on WhatsApp</span>
              </a>
              <Link
                className={marketingButtonClass("secondary", "em-contact-message")}
                href="/contact"
              >
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
            Existing users:{" "}
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
