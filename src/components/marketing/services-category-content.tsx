import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  Package,
  Sheet,
  Users,
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
import { ServicesBreadcrumb } from "@/components/marketing/services-breadcrumb";
import { ServicesSubNav } from "@/components/marketing/services-sub-nav";
import {
  hrServicesSection,
  hrWorkspaceModules,
} from "@/app/hr-module-content";
import {
  serviceCategories,
  serviceCategoryBySlug,
  type ServiceCategory,
  type ServiceCategorySlug,
} from "@/app/services-content";
import { servicesPage } from "@/app/page-content";
import { whatsappDisplayNumber } from "@/app/site-content";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/services-page.css";

const categoryIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  "whatsapp-ai": { icon: Bot, tone: "tone-green" },
  mis: { icon: BarChart3, tone: "tone-sky" },
  hr: { icon: CalendarCheck, tone: "tone-emerald" },
  tasks: { icon: ClipboardList, tone: "tone-indigo" },
  crm: { icon: Users, tone: "tone-violet" },
  inventory: { icon: Package, tone: "tone-amber" },
  flow: { icon: GitBranch, tone: "tone-slate" },
  automation: { icon: Sheet, tone: "tone-rose" },
};

type ServicesCategoryContentProps = {
  slug: ServiceCategorySlug;
};

export function ServicesCategoryContent({ slug }: ServicesCategoryContentProps) {
  const category = serviceCategoryBySlug[slug];
  const meta = categoryIcons[slug] ?? categoryIcons.tasks;
  const Icon = meta.icon;
  const related = (category.relatedSlugs ?? [])
    .map((relatedSlug) => serviceCategoryBySlug[relatedSlug])
    .filter(Boolean);

  return (
    <MarketingPage>
      <div className="services-page">
        <SiteHeader />
        <ServicesSubNav currentSlug={slug} />

        <section className="services-detail-hero">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
            <ServicesBreadcrumb
              items={[
                { label: "Services", href: "/services" },
                { label: category.name },
              ]}
            />

            <div className="services-detail-hero-grid">
              <div className="services-detail-hero-copy">
                <p className="services-hero-kicker type-kicker text-sky-700">
                  {category.eyebrow}
                </p>
                <h1 className="services-hero-title">
                  {category.title}{" "}
                  {category.titleAccent ? (
                    <span className="services-hero-accent">
                      {category.titleAccent}
                    </span>
                  ) : null}
                </h1>
                <p className="services-hero-lead">{category.lead}</p>
                <div className="services-hero-actions marketing-actions">
                  <WhatsAppButton
                    label={category.ctaLabel}
                    message={category.whatsappMessage}
                  />
                  {category.workspaceHref ? (
                    <MarketingLinkButton
                      href={category.workspaceHref}
                      variant="secondary"
                    >
                      <span>{category.workspaceCta ?? "Open workspace"}</span>
                      <ArrowRight size={18} aria-hidden />
                    </MarketingLinkButton>
                  ) : null}
                </div>
              </div>

              <aside className="services-detail-problem-panel">
                <span className={`marketing-icon lg ${meta.tone}`} aria-hidden>
                  <Icon size={28} strokeWidth={2} />
                </span>
                <p className="services-detail-problem-label">Problem we fix</p>
                <h2>{category.problem}</h2>
                <p>{category.problemDetail}</p>
              </aside>
            </div>
          </div>
        </section>

        {slug === "hr" ? (
          <section className="services-hr-modules services-hr-modules-v2">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
              <div className="services-section-head">
                <p className="services-section-eyebrow">
                  {hrServicesSection.eyebrow}
                </p>
                <h2 className="services-section-title">
                  {hrServicesSection.title}
                </h2>
                <p className="services-section-lead">
                  {hrServicesSection.subcopy}
                </p>
              </div>

              <div className="services-hr-grid-v2">
                {hrWorkspaceModules.map((mod) => (
                  <HrModuleCard key={mod.id} mod={mod} variant="category" />
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
              </div>
            </div>
          </section>
        ) : null}

        <section className="services-detail-features">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head">
              <p className="services-section-eyebrow">What you get</p>
              <h2 className="services-section-title">
                {slug === "hr"
                  ? "All HR modules in one workspace"
                  : `Built for ${category.name.toLowerCase()}`}
              </h2>
            </div>

            <div className="services-detail-feature-grid">
              {category.features.map((feature) => (
                <article className="services-detail-feature-card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.detail}</p>
                </article>
              ))}
            </div>

            <ul className="services-detail-outcomes">
              {category.outcomes.map((outcome) => (
                <li key={outcome}>
                  <CheckCircle2 size={18} aria-hidden />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
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
                Ready to scope {category.name.toLowerCase()}?
              </p>
              <div className="contact-actions centered cta-stack">
                <WhatsAppButton
                  className="btn-block"
                  label={whatsappDisplayNumber}
                  message={category.whatsappMessage}
                />
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 ? (
          <section className="services-related">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
              <div className="services-section-head">
                <p className="services-section-eyebrow">Related services</p>
                <h2 className="services-section-title">
                  Often scoped together
                </h2>
              </div>
              <div className="services-related-grid">
                {related.map((item: ServiceCategory) => {
                  const relatedMeta =
                    categoryIcons[item.slug] ?? categoryIcons.tasks;
                  const RelatedIcon = relatedMeta.icon;
                  return (
                    <Link
                      className="services-related-card"
                      href={`/services/${item.slug}`}
                      key={item.slug}
                    >
                      <span
                        className={`marketing-icon sm ${relatedMeta.tone}`}
                        aria-hidden
                      >
                        <RelatedIcon size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.shortDescription}</p>
                      </div>
                      <ArrowRight size={16} aria-hidden />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <div className="services-back-bar">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Link className="services-back-link" href="/services">
              <ArrowLeft size={16} aria-hidden />
              <span>Back to all services</span>
            </Link>
          </div>
        </div>

        <FinalCta />
        <SiteFooter />
      </div>
    </MarketingPage>
  );
}

export function getServiceCategoryStaticParams() {
  return serviceCategories.map((category) => ({ slug: category.slug }));
}
