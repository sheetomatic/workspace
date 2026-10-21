import Link from "next/link";
import { Check, CheckCircle2, Minus } from "lucide-react";
import {
  businessAddonsEnquiryHref,
  businessPlanEnquiryHref,
  businessModuleReportsNote,
  businessPricingFaqs,
  businessSystemAddons,
  businessSystemBenefits,
  businessSystemComparison,
  businessSystemPlans,
  formatBusinessPlanPrice,
  tasksManagementEnquiryHref,
  tasksManagementPricing,
  whatsappApiSignupHref,
  type BusinessSystemPlan,
} from "@/lib/content/business-systems-pricing";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import "./em-ready-pricing.css";
import "./business-systems-pricing.css";

function PlanCard({ plan }: { plan: BusinessSystemPlan }) {
  return (
    <article
      className={`em-plan-card business-plan-card${plan.recommended ? " is-recommended" : ""}`}
      aria-labelledby={`plan-${plan.id}-title`}
      id={`plan-${plan.id}`}
    >
      <div className="business-plan-badge-slot">
        {plan.recommended ? <span className="business-plan-badge">Recommended</span> : null}
      </div>
      <h3 id={`plan-${plan.id}-title`} className="business-plan-title">{plan.name}</h3>
      <p className="business-plan-price">
        <strong>{formatBusinessPlanPrice(plan.monthlyPriceInr)}</strong>
        <span>/month</span>
      </p>
      <p className="business-plan-billing">Monthly plans. No yearly commitment.</p>
      <p className="business-plan-fit">{plan.fit}</p>
      <p className="business-plan-includes">{plan.includesLabel}</p>
      <ul className="business-plan-features">
        {plan.features.map((feature) => (
          <li key={feature}><CheckCircle2 size={18} aria-hidden="true" /><span>{feature}</span></li>
        ))}
      </ul>
      <p className="business-plan-billing business-module-reports">{businessModuleReportsNote}</p>
      <div className="business-plan-actions">
        <a
          className={marketingButtonClass("primary", "business-plan-trial")}
          href={businessPlanEnquiryHref(plan, "trial")}
          aria-label={`Request a 3-Day Trial — ${plan.name} (opens WhatsApp)`}
          aria-describedby="business-enquiry-note"
          target="_blank"
          rel="noopener noreferrer"
        >
          Request a 3-Day Trial
        </a>
        <a
          className={marketingButtonClass("secondary", "business-plan-demo")}
          href={businessPlanEnquiryHref(plan, "demo")}
          aria-label={`Request a Demo — ${plan.name} (opens WhatsApp)`}
          aria-describedby="business-enquiry-note"
          target="_blank"
          rel="noopener noreferrer"
        >
          Request a Demo
        </a>
      </div>
    </article>
  );
}

export function EmReadyPricing() {
  return (
    <div className="em-pricing-page business-pricing-page">
      <section className="em-pricing-hero business-pricing-hero">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="em-pricing-hero-inner">
            <p className="em-pricing-kicker">Business Systems Suite</p>
            <h1>Ready-to-use business systems. We handle the setup.</h1>
            <p className="em-pricing-lead">Choose the tools your business needs—without the Google Sheets setup hassle.</p>
            <p className="business-monthly-promise">Monthly plans. No yearly commitment.</p>
          </div>
          <ul className="business-common-benefits" aria-label="Available with every plan">
            {businessSystemBenefits.map((benefit) => (
              <li key={benefit}><CheckCircle2 size={19} aria-hidden="true" /><span>{benefit}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="em-pricing-section" id="pricing-options" aria-labelledby="business-plans-title">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="business-section-heading">
            <h2 id="business-plans-title">Choose your monthly plan</h2>
            <p>All prices are in INR. GST is extra. Setup is included.</p>
          </div>
          <aside className="business-bundle-note" aria-labelledby="business-bundle-title">
            <h3 id="business-bundle-title">Looking for FMS, IMS and Checklists together?</h3>
            <p>
              Choose <a href="#plan-enterprise">Enterprise</a> for all three.
              FMS and Checklists are included in every plan; IMS / Stock is included only in Enterprise.
            </p>
            <a href="#business-comparison-title">Compare every included module</a>
          </aside>
          <div className="business-pricing-grid">
            {businessSystemPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </div>
          <p className="business-enquiry-note" id="business-enquiry-note">
            Requests open WhatsApp with your selected plan. A request does not activate a trial or confirm a booking.
            Our team will confirm access, timing, applicable terms and any charges before you proceed.
          </p>

          <section className="business-tasks-pricing" aria-labelledby="tasks-pricing-title">
            <div className="business-tasks-heading">
              <p className="em-pricing-kicker">Standalone system</p>
              <h2 id="tasks-pricing-title">{tasksManagementPricing.name}</h2>
              <p>Assign, track and follow through on team work without purchasing the complete suite.</p>
            </div>
            <dl className="business-tasks-rates">
              <div className="business-task-rate-card"><dt>Monthly access</dt><dd>{formatBusinessPlanPrice(tasksManagementPricing.monthlyPerUserInr)}<span>per user, billed monthly</span></dd></div>
              <div className="business-task-rate-card"><dt>Additional seat</dt><dd>{formatBusinessPlanPrice(tasksManagementPricing.extraSeatMonthlyInr)}<span>per extra seat, per month</span></dd></div>
              <div className="business-task-rate-card is-featured"><dt>Yearly access</dt><dd>{formatBusinessPlanPrice(tasksManagementPricing.yearlyPerUserInr)}<span>per user, billed yearly</span></dd><small>Best value for a full year</small></div>
              <div className="business-task-rate-card is-addon">
                <dt>Optional WhatsApp API</dt>
                <dd>{formatBusinessPlanPrice(tasksManagementPricing.whatsappApiYearlyInr)}<span>per year</span></dd>
                <small>Provider usage charges may apply</small>
                <div className="business-task-addon-actions">
                  <a href={whatsappApiSignupHref} target="_blank" rel="noopener noreferrer">Start Today (Sign Up)</a>
                </div>
              </div>
            </dl>
            <div className="business-tasks-footer">
              <p className="business-addon-note"><strong>GST is extra.</strong> WhatsApp API is optional. Confirm users, setup scope, usage charges and renewal terms before subscribing.</p>
              <a className={marketingButtonClass("primary")} href={tasksManagementEnquiryHref} target="_blank" rel="noopener noreferrer">
                Enquire About Tasks Management
              </a>
            </div>
          </section>

          <section className="business-comparison" aria-labelledby="business-comparison-title">
            <div className="business-section-heading">
              <h2 id="business-comparison-title">Compare what’s included</h2>
              <p>Each plan builds on the one before it. Task Management includes delegation, and reports are part of every included module. FMS means Flow Monitoring System; IMS means Inventory Management System.</p>
            </div>
            <div className="business-comparison-scroll" role="region" aria-label="Plan feature comparison" tabIndex={0}>
              <table className="business-comparison-table">
                <caption className="sr-only">Features included in Starter, Scale, and Enterprise monthly plans</caption>
                <thead>
                  <tr>
                    <th scope="col">Features</th>
                    {businessSystemPlans.map((plan) => <th scope="col" key={plan.id}>{plan.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {businessSystemComparison.map((row) => (
                    <tr key={row.feature}>
                      <th scope="row">{row.feature}</th>
                      {row.included.map((included, index) => (
                        <td key={businessSystemPlans[index].id}>
                          {included ? <Check size={20} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}
                          <span className="sr-only">{included ? "Included" : "Not included"}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="business-addons" aria-labelledby="business-addons-title">
            <div>
              <p className="em-pricing-kicker">Optional add-ons</p>
              <h2 id="business-addons-title">Need more? Add-ons available.</h2>
              <p>Extend your plan with optional add-ons. Contact us to discuss availability, scope and pricing.</p>
              <ul className="business-addon-list">
                {businessSystemAddons.map((addon) => <li key={addon}>{addon}</li>)}
              </ul>
              <p className="business-addon-note">Add-ons are quoted separately and are not included in the subscriptions above.</p>
              <Link href="/whatsapp-plans" className="business-text-link">View WhatsApp API details</Link>
            </div>
            <a className={marketingButtonClass("primary")} href={businessAddonsEnquiryHref} target="_blank" rel="noopener noreferrer">
              Enquire About Add-ons
            </a>
          </section>

          <aside className="business-pricing-terms" aria-labelledby="business-terms-title">
            <h2 id="business-terms-title">Before you start</h2>
            <p>Setup for your selected plan is included and handled by Sheetomatic. Confirm the setup scope before subscribing. Customization, integrations and additional professional services are scoped and quoted separately.</p>
            <p>Additional professional services: <Link href="/terms/services">T&amp;C apply</Link>.</p>
          </aside>

          <section className="business-pricing-faq" aria-labelledby="business-faq-title">
            <div className="business-section-heading">
              <h2 id="business-faq-title">Plans, setup and trial questions</h2>
            </div>
            {businessPricingFaqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>

          <div className="business-pricing-links">
            <p>Existing users: <Link href={WORKSPACE_LOGIN_HREF}>Sign in to Workspace</Link></p>
            <p>Looking for Sheetomatic AI (WhatsApp) plans? <Link href="/ai/pricing">See AI pricing</Link></p>
            <p>Prefer another way to get in touch? <Link href="/contact">Contact Sheetomatic</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
