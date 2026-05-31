import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  ListChecks,
  MapPin,
  Package,
  Sheet,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "../components";
import {
  MarketingLinkButton,
  WhatsAppButton,
} from "@/components/marketing/marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import {
  serviceProblemSolutions,
  servicesPage,
} from "../page-content";
import {
  attendanceLeaveModule,
  fieldTrackingModule,
  hrHiringModule,
  hrServicesSection,
} from "../hr-module-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/services-page.css";

export const metadata: Metadata = marketingMetadata({
  title: "Services",
  description:
    "End-to-end AI-powered solutions for Indian MSMEs - WhatsApp automation, CRM, MIS, inventory, tasks, and workflow delivery.",
  path: "/services",
});

const ownerGlanceIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  AI: { icon: Bot, tone: "tone-green" },
  MIS: { icon: BarChart3, tone: "tone-sky" },
  Flow: { icon: GitBranch, tone: "tone-indigo" },
  Ops: { icon: ListChecks, tone: "tone-emerald" },
};

const solutionIcons: Record<string, LucideIcon> = {
  "AI task delegation": ClipboardList,
  "Attendance & leave system": CalendarCheck,
  "Field executive tracking": MapPin,
  "AI-powered CRM": Users,
  "WhatsApp AI chatbot": Bot,
  "AI-assisted MIS": BarChart3,
  "Inventory management": Package,
  "Flow monitoring": GitBranch,
  "Workflow automation": Sheet,
};

export default function ServicesPage() {
  return (
    <MarketingPage>
      <div className="services-page">
        <SiteHeader />

        <section className="services-hero">
          <div className="services-hero-grid mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="services-hero-copy">
              <p className="services-hero-kicker type-kicker text-sky-700">
                {servicesPage.eyebrow}
              </p>
              <h1 className="services-hero-title">
                {servicesPage.title}{" "}
                <span className="services-hero-accent">
                  {servicesPage.titleAccent}
                </span>
              </h1>
              <p className="services-hero-lead">{servicesPage.lead}</p>
              <div className="services-hero-actions marketing-actions">
                <WhatsAppButton label={whatsappDisplayNumber} />
                <MarketingLinkButton href="/products" variant="secondary">
                  <span>See products</span>
                  <ArrowRight size={18} aria-hidden />
                </MarketingLinkButton>
              </div>

              <ul className="services-hero-stats" aria-label="Why owners start here">
                {servicesPage.heroStats.map((stat) => (
                  <li className="services-stat" key={stat.headline}>
                    <span className="services-stat-value">{stat.value}</span>
                    <div className="services-stat-body">
                      <strong>{stat.headline}</strong>
                      <p>{stat.label}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="services-audience" aria-label="Industries">
                <span className="services-audience-label">
                  {servicesPage.audienceLabel}
                </span>
                {servicesPage.audienceTags.map((tag) => (
                  <span className="services-audience-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <aside className="services-outcomes" aria-label="Owner outcomes">
              <p className="services-outcomes-label">
                {servicesPage.ownerGlance.eyebrow}
              </p>
              <ul className="services-outcomes-list">
                {servicesPage.ownerGlance.items.map((item) => {
                  const meta = ownerGlanceIcons[item.tag] ?? ownerGlanceIcons.MIS;
                  const Icon = meta.icon;
                  return (
                    <li className="services-outcomes-item" key={item.tag}>
                      <span
                        className={`marketing-icon sm ${meta.tone}`}
                        aria-hidden
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <span className="services-outcomes-tag">{item.tag}</span>
                        <strong>{item.headline}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="services-outcomes-foot">
                {servicesPage.ownerGlance.footnote}
              </p>
            </aside>
          </div>
        </section>

        <section className="services-ps-section">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">Problem → Solution</p>
              <h2 className="services-section-title">
                {servicesPage.problemSolutionTitle}
              </h2>
              <p className="services-section-lead">
                {servicesPage.problemSolutionLead}
              </p>
            </div>

            <div className="services-ps-list">
              {serviceProblemSolutions.map((item) => {
                const Icon = solutionIcons[item.solution] ?? Wrench;
                return (
                  <article className="services-ps-card" key={item.solution}>
                    <div className="services-ps-problem">
                      <span className="services-ps-label">Problem</span>
                      <h3>{item.problem}</h3>
                      <p>{item.problemDetail}</p>
                    </div>
                    <div className="services-ps-arrow" aria-hidden>
                      <ArrowRight size={20} />
                    </div>
                    <div className="services-ps-solution">
                      <span className="services-ps-label solution">Solution</span>
                      <div className="services-ps-solution-head">
                        <span className="services-ps-icon" aria-hidden>
                          <Icon size={18} />
                        </span>
                        <h3>{item.solution}</h3>
                      </div>
                      <p>{item.solutionDetail}</p>
                      <MarketingLinkButton
                        className="services-ps-link"
                        href={item.href}
                        variant="secondary"
                      >
                        <span>{item.cta}</span>
                        <ArrowRight size={16} aria-hidden />
                      </MarketingLinkButton>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="services-hr-modules">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">{hrServicesSection.eyebrow}</p>
              <h2 className="services-section-title">{hrServicesSection.title}</h2>
              <p className="services-section-lead">{hrServicesSection.subcopy}</p>
            </div>

            <div className="services-hr-grid">
              {[attendanceLeaveModule, fieldTrackingModule, hrHiringModule].map(
                (mod) => (
                  <article className="services-hr-card" key={mod.id}>
                    <h3>{mod.name}</h3>
                    <p className="services-hr-tagline">{mod.tagline}</p>
                    <ul>
                      {mod.features.slice(0, 5).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <MarketingLinkButton
                      href={`/login?callbackUrl=${encodeURIComponent(mod.workspacePath)}`}
                      variant="secondary"
                    >
                      <span>Open in workspace</span>
                      <ArrowRight size={16} aria-hidden />
                    </MarketingLinkButton>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="services-process-compact">
          <div className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">How we work</p>
              <h2 className="services-section-title">{servicesPage.processTitle}</h2>
            </div>
            <ol className="services-process-row">
              {servicesPage.processSteps.map((step) => (
                <li className="services-process-chip" key={step.step}>
                  <span className="services-process-num">{step.step}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="services-bottom-cta services-bottom-cta-compact">
              <p className="services-bottom-cta-lead">
                <CheckCircle2 size={18} aria-hidden />
                {servicesPage.ownerGlance.footnote}
              </p>
              <div className="contact-actions centered cta-stack">
                <WhatsAppButton className="btn-block" label={whatsappDisplayNumber} />
              </div>
            </div>
          </div>
        </section>

        <FinalCta />
        <SiteFooter />
      </div>
    </MarketingPage>
  );
}
