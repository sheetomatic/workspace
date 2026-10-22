import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  ListChecks,
  MapPin,
  Package,
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
  ContactButtons,
  MarketingLinkButton,
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
  problemSolutionPresets,
  serviceProblemSolutions,
  servicesIndustryCards,
  servicesPage,
} from "@/app/page-content";
import { servicesHubVideos } from "@/app/video-content";
import { VideoEmbed } from "@/components/marketing/video-embed";
import { SolutionPreview } from "@/components/marketing/business-library-section";
import { ProblemSolutionVisualSection } from "@/components/marketing/problem-solution-visual";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/videos.css";
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
  checklist: { icon: ClipboardCheck, tone: "tone-rose" },
  "field-tracking": { icon: MapPin, tone: "tone-sky" },
  automation: { icon: Wrench, tone: "tone-slate" },
};

const ownerGlanceIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  AI: { icon: Bot, tone: "tone-green" },
  MIS: { icon: BarChart3, tone: "tone-sky" },
  Flow: { icon: GitBranch, tone: "tone-indigo" },
  Ops: { icon: ListChecks, tone: "tone-emerald" },
};

const solutionHrefOverrides: Record<string, string> = {
  "Attendance & leave system": "/services/hr/attendance-leave",
  "Field executive tracking": "/services/field-tracking",
  "Field Executive Management Systems": "/services/field-tracking",
  "AI task delegation": "/services/tasks",
  "AI-powered CRM": "/services/crm",
  "WhatsApp AI chatbot": "/services/whatsapp-ai",
  "AI-assisted MIS": "/services/mis",
  "Inventory management": "/services/inventory",
  "Flow monitoring": "/services/flow",
  "Custom Software": "/services/automation",
  "FMS — Flow Monitoring": "/services/flow",
  "IMS — Inventory Management": "/services/inventory",
  "Process Coordinator": "/services/checklist",
  "Executive Assistant": "/services/tasks",
  "Executive Meeting (Weekly)": "/services/mis",
  "WhatsApp AI + CRM": "/services/whatsapp-ai",
  "Custom automation": "/services/automation",
};

const industryIcons: Record<string, LucideIcon> = {
  Manufacturing: Wrench,
  Distribution: Truck,
  Services: Briefcase,
  Trading: Store,
  "Job work": ClipboardList,
  Ecommerce: Store,
  "Real Estate": Building2,
  Healthcare: Stethoscope,
};

function ServiceFlowVisual() {
  return (
    <div className="services-flow-visual" aria-label="Illustrative view of business updates becoming organized work">
      <div className="services-flow-visual-head">
        <span>THE WORK, CONNECTED</span>
        <span className="services-flow-live"><i aria-hidden /> Workspace view</span>
      </div>
      <div className="services-flow-visual-body">
        <div className="services-flow-inputs" aria-label="Inputs">
          <span><ClipboardList size={15} aria-hidden /> Orders</span>
          <span><Package size={15} aria-hidden /> Stock</span>
          <span><Bot size={15} aria-hidden /> Messages</span>
        </div>
        <div className="services-flow-arrow" aria-hidden><ArrowRight size={20} /></div>
        <div className="services-flow-board">
          <div className="services-flow-board-head"><GitBranch size={15} aria-hidden /><strong>Team workflow</strong><span>Live</span></div>
          <div className="services-flow-board-row"><i className="is-done" /><span>Owner assigned</span><b>Ready</b></div>
          <div className="services-flow-board-row"><i className="is-active" /><span>Next action visible</span><b>In progress</b></div>
          <div className="services-flow-board-row"><i /><span>Progress collected</span><b>Tracked</b></div>
        </div>
      </div>
      <p className="services-flow-visual-note">Illustrative view · configured around each team&apos;s process</p>
    </div>
  );
}

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
              <div className="services-hero-actions marketing-actions centered">
                <ContactButtons
                  whatsappLabel={whatsappDisplayNumber}
                  callLabel="Call"
                />
                <MarketingLinkButton href="/products" variant="secondary">
                  <span>Read case studies</span>
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
              <ServiceFlowVisual />
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
                    <SolutionPreview slug={category.slug} />
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

            <p className="services-snapshot-note">
              Sample workspace snapshots · Final screens, owners, and alerts are configured around your team&apos;s actual process.
            </p>

            <div className="services-video-proof">
              <div className="services-section-head">
                <p className="services-section-eyebrow">See the systems in action</p>
                <h3 className="services-video-proof-title">A closer look at practical business workflows.</h3>
              </div>
              <div className="video-hub-grid">
                {servicesHubVideos.map((video) => (
                  <VideoEmbed key={video.id} video={video} variant="compact" />
                ))}
              </div>
            </div>

            <p className="services-hub-footnote">{servicesHub.deliveryNote}</p>
          </div>
        </section>

        <section className="services-ps-section">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
            <ProblemSolutionVisualSection
              embedded
              cardIds={problemSolutionPresets.servicesHub}
              eyebrow="Core ops proofs"
              title="Flow and stock — before and after"
              lead="Each service page has its own visual. Here are the two owners open first."
            />

            <div className="services-ps-more">
              <p className="services-ps-more-label">Also available</p>
              <ul className="services-ps-more-list">
                {serviceProblemSolutions
                  .filter((item) => item.solution === "Custom Software")
                  .map((item) => {
                    const href =
                      solutionHrefOverrides[item.solution] ?? item.href;
                    return (
                      <li key={item.solution}>
                        <Link href={href}>
                          <span className="services-ps-more-problem">
                            {item.problem}
                          </span>
                          <span className="services-ps-more-arrow" aria-hidden>
                            →
                          </span>
                          <span className="services-ps-more-solution">
                            {item.solution}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
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
              {hrWorkspaceModules
                .filter((mod) => mod.id !== "field-tracking")
                .map((mod) => (
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
                    {servicesIndustryCards.map((item) => {
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
                            Explore module
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
              <ContactButtons
                className="contact-actions centered cta-stack"
                whatsappClassName="btn-block"
                whatsappLabel={whatsappDisplayNumber}
                callClassName="btn-block"
              />
            </div>
          </div>
        </section>

        <FinalCta />
        <SiteFooter />
      </div>
    </MarketingPage>
  );
}
