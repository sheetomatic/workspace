import Image from "next/image";
import { audienceFilter } from "@/app/sales-framework-content";
import {
  ConsultTodayButton,
  WhatsAppButton,
} from "@/components/marketing/marketing-buttons";
import { SystemLaunchSequence } from "@/components/marketing/system-launch-sequence";
import "./pace-framework.css";
import "./sales-journey.css";

export function SalesHeroSection() {
  return (
    <section className="minimal-hero sales-hero" id="program">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="sales-hero-layout">
          <div className="sales-hero-core">
            <p className="type-kicker text-sky-700">Business Control &amp; Intelligence for MSMEs</p>
            <h1 className="minimal-hero-title">Build a business that runs without you chasing it.</h1>
            <p className="minimal-hero-lead">
              Sheetomatic turns your orders, stock, follow-ups, and team work into one
              live system — so you see what needs attention and your team owns the rest.
            </p>
            <div className="minimal-hero-actions">
              <ConsultTodayButton label="Book a 30-min system call" />
              <WhatsAppButton
                className="sales-hero-whatsapp"
                label="WhatsApp now"
                message="Hi Sheetomatic, I want to scope a workspace for my business."
              />
            </div>
            <p className="sales-hero-cta-note">
              Tell us where work gets stuck. We will recommend the first system worth
              building — no generic software demo.
            </p>
          </div>
          <div className="sales-hero-engine" aria-label="Sheetomatic turns daily business chaos into an organised system">
            <Image
              src="/marketing/unstructured-to-dashboard.png"
              alt="Unstructured papers and chats flowing into a user-wise task dashboard and phone status view"
              width={1792}
              height={1024}
              priority
              sizes="(max-width: 900px) 88vw, 48vw"
            />
            <span className="sales-hero-engine-caption">Unstructured data → live control</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AudienceFilterSection() {
  return (
    <section aria-labelledby="audience-filter-title" className="sales-audience section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="sales-section-title" id="audience-filter-title">
          {audienceFilter.title}
        </h2>
        <div className="sales-audience-grid">
          <article className="sales-audience-card sales-audience-card--yes">
            <h3>{audienceFilter.forYou.label}</h3>
            <ul>
              {audienceFilter.forYou.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="sales-audience-card sales-audience-card--no">
            <h3>{audienceFilter.notForYou.label}</h3>
            <ul>
              {audienceFilter.notForYou.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

export function SpreadsheetPainSection() {
  return <SystemLaunchSequence />;
}
