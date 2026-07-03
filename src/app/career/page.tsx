import type { Metadata } from "next";
import { Briefcase, CheckCircle2, Gift, UserCheck } from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { careerPage } from "../page-content";
import { misTalentCareers } from "../marketing-content";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/mis-careers.css";

export const metadata: Metadata = marketingMetadata({
  title: "Careers",
  description:
    "Join the Sheetomatic payroll bench - MIS, AI tools, WhatsApp automation, and Google Workspace roles on Sheetomatic Payroll.",
  path: "/career",
});

export default function CareerPage() {
  const content = misTalentCareers;
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow={careerPage.eyebrow}
        title={careerPage.title}
        text={careerPage.lead}
      />

      <section className="mis-careers-band career-page-band">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mis-careers-inner">
            <div>
              <p className="mis-careers-kicker flex items-center gap-2">
                <Briefcase size={16} />
                {content.kicker}
              </p>
              <h2 className="mis-careers-title">{content.title}</h2>
              <p className="mis-careers-lead">{content.lead}</p>
              <div className="mis-careers-actions">
                <ContactButtons
                  whatsappLabel="Apply on WhatsApp"
                  callLabel="Call us"
                  message={content.whatsappApplyMessage}
                />
              </div>
              <p className="mis-careers-note">{content.ctaNote}</p>
            </div>

            <div className="mis-careers-panel">
              <article className="mis-careers-card">
                <div className="mis-careers-card-head">
                  <span className="marketing-icon sm tone-emerald" aria-hidden>
                    <UserCheck size={20} />
                  </span>
                  <h3>{content.fitTitle}</h3>
                </div>
                <ul className="mis-careers-list">
                  {content.fitPoints.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={18} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="mis-careers-card">
                <div className="mis-careers-card-head">
                  <span className="marketing-icon sm tone-sky" aria-hidden>
                    <Gift size={20} />
                  </span>
                  <h3>{content.perksTitle}</h3>
                </div>
                <ul className="mis-careers-list">
                  {content.perks.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={18} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className="mis-careers-steps mt-10">
            {content.steps.map((item) => (
              <article className="mis-careers-step" key={item.step}>
                <span>Step {item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
