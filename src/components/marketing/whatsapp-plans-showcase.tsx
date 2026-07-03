import Link from "next/link";
import {
  ContactButtons,
} from "@/components/marketing/marketing-buttons";
import { WhatsappPlansGrid } from "@/components/marketing/whatsapp-plans-grid";
import {
  officialWhatsappPlans,
  whatsappPlansPage,
  type OfficialWhatsappPlanCard,
} from "@/lib/content/whatsapp-plans-content";

function officialPlanPrice(plan: OfficialWhatsappPlanCard) {
  return String(plan.price);
}

export function WhatsappPlansShowcase() {
  const page = whatsappPlansPage;
  const waMessage = "Hi Sheetomatic, I want to subscribe to WhatsApp API plan.";
  const panelUrl = "https://wa.sheetomatic.com";
  const panelSignupUrl = "https://wa.sheetomatic.com/Signup";
  const monthlyOfficialPlans = officialWhatsappPlans.plans.filter((plan) => plan.cycle === "monthly");
  const yearlyOfficialPlans = officialWhatsappPlans.plans.filter((plan) => plan.cycle === "yearly");

  return (
    <>
      <section className="wa-plans-hero-cards section wa-plans-hero-surface pb-12">
        <div className="mx-auto grid max-w-4xl gap-5 px-5 sm:grid-cols-2 sm:px-8">
          <article className="wa-plan-hero-card">
            <p className="wa-plan-hero-label">Core</p>
            <h2>{page.freeApi.title}</h2>
            <p>{page.freeApi.text}</p>
          </article>
          <article className="wa-plan-hero-card">
            <p className="wa-plan-hero-label">Setup</p>
            <h2>{page.setup.title}</h2>
            <p>
              {page.setup.text}{" "}
              <strong>{page.setup.priceLabel}</strong>
            </p>
            <p className="wa-plan-hero-note">{page.setup.note}</p>
          </article>
        </div>
      </section>

      <section className="section wa-plans-catalog-surface pb-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="wa-plans-section-head">
            <h2>{page.plansSection.title}</h2>
            <p>{page.plansSection.subtitle}</p>
          </div>
          <WhatsappPlansGrid />
        </div>
      </section>

      <section className="section wa-plans-official-surface pb-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="wa-plans-section-head">
            <h2>Official WhatsApp plans from our panel</h2>
            <p>
              Monthly and yearly panel plans are shown here exactly as the current
              `wa.sheetomatic.com` catalog structure.
            </p>
          </div>

          <div className="wa-official-tabs-shell">
            <fieldset className="wa-official-tabs-head" aria-label="Official WhatsApp plan billing">
              <legend className="sr-only">Official WhatsApp plan billing</legend>
              <input
                className="wa-official-tab-input"
                id="wa-official-cycle-monthly"
                type="radio"
                name="wa-official-cycle"
                defaultChecked
              />
              <label className="wa-official-tab" htmlFor="wa-official-cycle-monthly">
                {officialWhatsappPlans.tabs[0].label}
              </label>
              <input
                className="wa-official-tab-input"
                id="wa-official-cycle-yearly"
                type="radio"
                name="wa-official-cycle"
              />
              <label className="wa-official-tab" htmlFor="wa-official-cycle-yearly">
                {officialWhatsappPlans.tabs[1].label}
              </label>
            </fieldset>

            <div className="wa-official-panels">
              <div className="wa-official-panel" data-cycle="monthly">
                <div className="wa-official-cards">
                  {monthlyOfficialPlans.map((plan) => (
                    <article key={plan.id} className="wa-plan-card wa-official-plan-card">
                      <div className="wa-plan-card-top">
                        <span className="wa-plan-category">Official API</span>
                        <span className="wa-plan-badge">Monthly</span>
                      </div>
                      <h3 className="wa-plan-name">{plan.title}</h3>
                      <p className="wa-plan-meta">Validity: {plan.validityLabel}</p>
                      {plan.planId ? (
                        <p className="wa-plan-meta wa-official-plan-id">Plan ID: {plan.planId}</p>
                      ) : null}
                      <p className="wa-plan-price" aria-label={`Price ${plan.price}`}>
                        ₹{officialPlanPrice(plan)}
                      </p>
                      <div className="wa-official-card-actions">
                        <a
                          className="wa-official-apply"
                          href={panelUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Apply Plan
                        </a>
                      </div>
                      <ul className="wa-official-features">
                        {plan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div className="wa-official-panel" data-cycle="yearly">
                <div className="wa-official-cards">
                  {yearlyOfficialPlans.map((plan) => (
                    <article key={plan.id} className="wa-plan-card wa-official-plan-card">
                      <div className="wa-plan-card-top">
                        <span className="wa-plan-category">Official API</span>
                        <span className="wa-plan-badge">Yearly</span>
                      </div>
                      <h3 className="wa-plan-name">{plan.title}</h3>
                      <p className="wa-plan-meta">Validity: {plan.validityLabel}</p>
                      {plan.planId ? (
                        <p className="wa-plan-meta wa-official-plan-id">Plan ID: {plan.planId}</p>
                      ) : null}
                      <p className="wa-plan-price" aria-label={`Price ${plan.price}`}>
                        ₹{officialPlanPrice(plan)}
                      </p>
                      <div className="wa-official-card-actions">
                        <a
                          className="wa-official-apply"
                          href={panelUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Apply Plan
                        </a>
                      </div>
                      <ul className="wa-official-features">
                        {plan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="wa-plan-official-note">
            Open `wa.sheetomatic.com` to apply one of these official plans, or create a
            panel account below if you are signing up for the first time.
          </p>
          <div className="wa-plan-official-actions">
            <a
              className="btn-cta btn-secondary wa-plan-official-btn"
              href={panelUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open wa.sheetomatic.com
            </a>
            <a
              className="btn-cta btn-primary wa-plan-official-btn"
              href={panelSignupUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Create panel account
            </a>
          </div>
        </div>
      </section>

      <section className="section wa-plans-contact-surface pb-16">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <div className="wa-plans-contact-panel">
            <p className="wa-plans-contact-kicker">Need help choosing a plan?</p>
            <h2>Talk to Sheetomatic before you pay</h2>
            <p className="wa-plans-contact-copy">
              We can suggest the right unofficial recharge or official panel plan
              based on your message volume, team size, and rollout scope.
            </p>
            <p className="wa-plans-contact-links">
              <a href={`tel:${page.contact.phone}`}>{page.contact.phoneDisplay}</a>
              <span>•</span>
              <a href={`mailto:${page.contact.email}`}>{page.contact.email}</a>
              <span>•</span>
              <a href={page.contact.enquiryFormUrl} target="_blank" rel="noopener noreferrer">
                Enquiry form
              </a>
            </p>
            <p className="wa-plans-contact-terms">{page.termsNote}</p>
            <p className="wa-plans-contact-terms-link">
              <Link className="text-sky-700 underline" href={page.termsHref}>
                Read WhatsApp API terms &amp; conditions
              </Link>
            </p>
            <ContactButtons
              className="cta-stack mx-auto mt-8 max-w-sm"
              whatsappClassName="btn-block"
              whatsappLabel="WhatsApp to pick a plan"
              callClassName="btn-block"
              callLabel="Call about plans"
              message={waMessage}
            />
          </div>
        </div>
      </section>
    </>
  );
}
