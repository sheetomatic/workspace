import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  GraduationCap,
  ListChecks,
  MapPin,
  Package,
  Plane,
  Sheet,
  Stethoscope,
  Store,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import {
  MarketingLinkButton,
  WhatsAppButton,
} from "@/components/marketing/marketing-buttons";
import { HrModuleCard } from "@/components/marketing/hr-module-card";
import { ServicesSubNav } from "@/components/marketing/services-sub-nav";
import { whatsappDisplayNumber } from "@/app/site-content";
import {
  hrServicesSection,
  hrWorkspaceModules,
} from "@/app/hr-module-content";
import {
  serviceCategoryBySlug,
  servicesBrowseCards,
  servicesHub,
} from "@/app/services-content";
import {
  footerIndustryLinks,
  serviceProblemSolutions,
  servicesPage,
} from "@/app/page-content";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/services-page.css";

const categoryIcons: Record<
  string,
  { icon: LucideIcon; tone: string }
> = {
  "whatsapp-ai": { icon: Bot, tone: "tone-green" },
  mis: { icon: BarChart3, tone: "tone-sky" },
  hr: { icon: CalendarCheck, tone: "tone-emerald" },
  tasks: { icon: ClipboardList, tone: "tone-indigo" },
  crm: { icon: Users, tone: "tone-violet" },
  inventory: { icon: Package, tone: "tone-amber" },
  flow: { icon: GitBranch, tone: "tone-slate" },
  automation: { icon: Sheet, tone: "tone-rose" },
};

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

const solutionHrefOverrides: Record<string, string> = {
  "Attendance & leave system": "/services/hr/attendance-leave",
  "Field executive tracking": "/services/hr/field-tracking",
  "AI task delegation": "/services/tasks",
  "AI-powered CRM": "/services/crm",
  "WhatsApp AI chatbot": "/services/whatsapp-ai",
  "AI-assisted MIS": "/services/mis",
  "Inventory management": "/services/inventory",
  "Flow monitoring": "/services/flow",
  "Workflow automation": "/services/automation",
};

const industryIcons: Record<string, LucideIcon> = {
  Ecommerce: Store,
  "Real Estate": Building2,
  Healthcare: Stethoscope,
  Travel: Plane,
  Education: GraduationCap,
  SaaS: Briefcase,
  Logistics: Truck,
};

export function ServicesHubContent() {
  return (
    <MarketingPage>
      <div className="services-page">
        <SiteHeader />
        <ServicesSubNav currentSlug="hub" />

        <section className="services-hero" id="overview">
          <div className="services-hero-grid mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="services-hero-copy">
              <p className="services-hero-kicker type-kicker text-sky-700">
                {servicesHub.eyebrow}
              </p>
              <h1 className="services-hero-title">
                {servicesHub.title}{" "}
                <span className="services-hero-accent">
                  {servicesHub.titleAccent}
                </span>
              </h1>
              <p className="services-hero-lead">{servicesHub.lead}</p>
              <div className="services-hero-actions marketing-actions">
                <WhatsAppButton label={whatsappDisplayNumber} />
                <MarketingLinkButton href="/products" variant="secondary">
                  <span>See products</span>
                  <ArrowRight size={18} aria-hidden />
                </MarketingLinkButton>
              </div>

              <ul
                className="services-hero-stats"
                aria-label="Why owners start here"
              >
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

              <div
                className="services-audience"
                aria-label={servicesPage.audienceLabel}
              >
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
                  const meta =
                    ownerGlanceIcons[item.tag] ?? ownerGlanceIcons.MIS;
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

        <section className="services-hub-grid-section" id="browse">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">Service categories</p>
              <h2 className="services-section-title">{servicesHub.browseTitle}</h2>
              <p className="services-section-lead">{servicesHub.browseLead}</p>
            </div>

            <div className="services-hub-grid">
              {servicesBrowseCards.map(({ slug, label }) => {
                const category = serviceCategoryBySlug[slug];
                const meta =
                  categoryIcons[category.slug] ?? categoryIcons.tasks;
                const Icon = meta.icon;
                return (
                  <Link
                    className={`services-hub-card${category.featured ? " featured" : ""}`}
                    href={`/services/${category.slug}`}
                    id={category.slug === "hr" ? "hr-modules" : undefined}
                    key={category.slug}
                  >
                    <div className="services-hub-card-top">
                      <span
                        className={`marketing-icon ${meta.tone}`}
                        aria-hidden
                      >
                        <Icon size={22} strokeWidth={2} />
                      </span>
                      {category.featured ? (
                        <span className="services-hub-badge">Popular</span>
                      ) : null}
                    </div>
                    <h3 className="services-hub-card-title">{label}</h3>
                    <p className="services-hub-card-blurb">
                      {category.shortDescription}
                    </p>
                    <p className="services-hub-card-detail">{category.hubBlurb}</p>
                    <span className="services-hub-card-link">
                      Explore {label}
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </Link>
                );
              })}
            </div>

            <p className="services-hub-footnote">{servicesHub.deliveryNote}</p>
          </div>
        </section>

        <section className="services-ps-section">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">Problem ? Solution</p>
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
                const href =
                  solutionHrefOverrides[item.solution] ?? item.href;
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
                        href={href}
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

        <section className="services-hr-modules services-hr-modules-v2">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">
                {hrServicesSection.eyebrow}
              </p>
              <h2 className="services-section-title">{hrServicesSection.title}</h2>
              <p className="services-section-lead">{hrServicesSection.subcopy}</p>
            </div>

            <div className="services-hr-grid-v2">
              {hrWorkspaceModules.map((mod) => (
                <HrModuleCard key={mod.id} mod={mod} />
              ))}
            </div>

            <div className="services-hr-footnote">
              <span>{hrServicesSection.footnote}</span>{" "}
              <MarketingLinkButton
                className="services-hr-careers-link"
                href={hrServicesSection.careersHref}
                variant="secondary"
              >
                <span>{hrServicesSection.careersLabel}</span>
                <ArrowRight size={14} aria-hidden />
              </MarketingLinkButton>
              <MarketingLinkButton
                className="services-hr-careers-link"
                href="/services/hr"
                variant="secondary"
              >
                <span>View all HR services</span>
                <ArrowRight size={14} aria-hidden />
              </MarketingLinkButton>
            </div>
          </div>
        </section>

        <section className="services-delivery services-industries" id="industries">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">Industries</p>
              <h2 className="services-section-title">
                {servicesPage.industriesTitle}
              </h2>
              <p className="services-section-lead">{servicesPage.industriesLead}</p>
            </div>

            <div className="services-industries-marquee">
              <div className="services-industries-track">
                {[0, 1].map((copy) => (
                  <div
                    className="services-industries-group"
                    key={copy}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {footerIndustryLinks.map((item) => {
                      const Icon = industryIcons[item.label] ?? Briefcase;
                      return (
                        <Link
                          className="services-industry-card"
                          href={item.href}
                          key={`${copy}-${item.label}`}
                          tabIndex={copy === 1 ? -1 : undefined}
                        >
                          <span className="marketing-icon sm tone-sky" aria-hidden>
                            <Icon size={18} strokeWidth={2} />
                          </span>
                          <h3 className="services-industry-card-title">{item.label}</h3>
                          <span className="services-industry-card-link">
                            Explore Sheetomatic AI
                            <ArrowRight size={16} aria-hidden />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="services-process-compact">
          <div className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">How we work</p>
              <h2 className="services-section-title">
                {servicesPage.processTitle}
              </h2>
              <p className="services-section-lead">{servicesPage.processLead}</p>
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
                {servicesPage.processCtaLead}
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
