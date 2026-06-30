import Link from "next/link";
import { WhatsAppButton } from "@/components/marketing/marketing-buttons";
import { WhatsappPlansGrid } from "@/components/marketing/whatsapp-plans-grid";
import { whatsappPlansPage } from "@/lib/content/whatsapp-plans-content";

export function WhatsappPlansShowcase() {
  const page = whatsappPlansPage;
  const waMessage = "Hi Sheetomatic, I want to subscribe to WhatsApp API plan.";

  return (
    <>
      <section className="wa-plans-hero-cards section bg-white pb-12">
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

      <section className="section bg-slate-50 pb-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="wa-plans-section-head">
            <h2>{page.plansSection.title}</h2>
            <p>{page.plansSection.subtitle}</p>
          </div>
          <WhatsappPlansGrid />
        </div>
      </section>

      <section className="section bg-white pb-16">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="type-body text-slate-700">
            Contact us:{" "}
            <a href={`tel:${page.contact.phone}`}>{page.contact.phoneDisplay}</a>
            {" | "}
            <a href={`mailto:${page.contact.email}`}>{page.contact.email}</a>
            {" | "}
            <a href={page.contact.enquiryFormUrl} target="_blank" rel="noopener noreferrer">
              Enquiry form
            </a>
          </p>
          <p className="type-body mt-4 text-slate-600">{page.termsNote}</p>
          <p className="mt-4">
            <Link className="text-sky-700 underline" href={page.termsHref}>
              Read WhatsApp API terms &amp; conditions
            </Link>
          </p>
          <div className="cta-stack mx-auto mt-8 max-w-sm">
            <WhatsAppButton
              className="btn-block"
              label="WhatsApp to pick a plan"
              message={waMessage}
            />
          </div>
        </div>
      </section>
    </>
  );
}
