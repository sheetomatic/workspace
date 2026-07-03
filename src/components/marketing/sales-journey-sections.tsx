import {
  audienceFilter,
  videoSalesStory,
} from "@/app/sales-framework-content";
import { homePainHook } from "@/app/page-content";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import { ExecutionSnapshot } from "@/components/marketing/execution-snapshot";
import { whatsappDisplayNumber } from "@/app/site-content";
import "./pace-framework.css";
import "./sales-journey.css";

export function SalesHeroSection() {
  return (
    <section className="minimal-hero sales-hero">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="sales-hero-layout">
          <div className="sales-hero-core">
            <p className="type-kicker text-sky-700">{videoSalesStory.eyebrow}</p>
            <h1 className="minimal-hero-title">{videoSalesStory.title}</h1>
            <p className="minimal-hero-lead">{videoSalesStory.lead}</p>
            <div className="minimal-hero-actions">
              <ContactButtons
                whatsappLabel={whatsappDisplayNumber}
                callLabel="Call now"
              />
            </div>
          </div>
          <div className="sales-hero-preview" aria-label="Workspace preview">
            <ExecutionSnapshot />
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
  return (
    <section
      aria-label="Why teams switch from spreadsheets"
      className="sales-pain section bg-white"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="home-pain-hook">
          <p className="home-pain-hook-eyebrow">{homePainHook.eyebrow}</p>
          <h2 className="home-pain-hook-title">{homePainHook.title}</h2>
          <p className="home-pain-hook-lead">{homePainHook.lead}</p>
          <ul className="home-pain-pills">
            {homePainHook.pains.map((pain) => (
              <li key={pain.title}>
                <strong>{pain.title}</strong>
                <span>{pain.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
