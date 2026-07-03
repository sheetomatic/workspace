import Link from "next/link";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import {
  taskWhatsappPlans,
  formatInr,
} from "@/app/product-content";
import { WhatsappPlansGrid } from "@/components/marketing/whatsapp-plans-grid";
import { whatsappPlansPage } from "@/lib/content/whatsapp-plans-content";

const officialPlans = [
  {
    id: "task-on-whatsapp",
    category: "Official",
    badge: "Live",
    name: "Task on WhatsApp",
    meta: "Minimum 8 users",
    price: "₹2,400",
    duration: " / user / year",
    note: "Voice or text task delegation, assignee alerts, and task board access.",
    href: "https://wa.me/919329103106?text=Hi%20Sheetomatic%2C%20I%20want%20Task%20on%20WhatsApp%20pricing%20for%20my%20team.",
  },
  {
    id: "ai-fms",
    category: "Official",
    badge: "Custom",
    name: "AI FMS",
    meta: "Price on request",
    price: "Custom",
    duration: " / quote",
    note: "Official WhatsApp with AI replies, CRM, inbox, lead capture, and FMS workflows.",
    href: "https://wa.me/919329103106?text=Hi%20Sheetomatic%2C%20I%20want%20pricing%20for%20AI%20FMS%20on%20official%20WhatsApp.",
  },
] as const;

export function WhatsappPlansShowcase() {
  const page = whatsappPlansPage;
  const waMessage = "Hi Sheetomatic, I want to subscribe to WhatsApp API plan.";

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
            <h2>Official WhatsApp Business plans from our panel</h2>
            <p>
              Only the plans we actively offer on `wa.sheetomatic.com`, shown in the
              same quick-scan style as the unofficial recharge cards.
            </p>
          </div>

          <div className="wa-plans-grid">
            {officialPlans.map((plan) => (
              <a
                key={plan.id}
                className={`wa-plan-card wa-plan-card-link${
                  plan.id === "task-on-whatsapp" ? " wa-plan-card-highlight" : ""
                }`}
                href={plan.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="wa-plan-card-top">
                  <span className="wa-plan-category">{plan.category}</span>
                  <span className="wa-plan-badge">{plan.badge}</span>
                </div>
                <h3 className="wa-plan-name">{plan.name}</h3>
                <p className="wa-plan-meta">{plan.meta}</p>
                <p className="wa-plan-price">
                  {plan.price}
                  <span className="wa-plan-duration">{plan.duration}</span>
                </p>
                <p className="wa-plan-meta">{plan.note}</p>
              </a>
            ))}
          </div>

          <p className="wa-plan-official-note">
            Task plan is {formatInr(taskWhatsappPlans[0]!.perUserAnnualInr ?? 2400)}
            /user/year with a minimum of 8 users. AI FMS is quoted based on scope,
            message volume, and rollout support.
          </p>
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
