import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  MapPin,
  Package,
  Wrench,
  UserRoundSearch,
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
  ContactButtons,
  MarketingLinkButton,
} from "@/components/marketing/marketing-buttons";
import { RelatedServicesSection } from "@/components/marketing/related-services-section";
import { ServicesBreadcrumb } from "@/components/marketing/services-breadcrumb";
import { ServicesSubNav } from "@/components/marketing/services-sub-nav";
import { whatsappDisplayNumber } from "@/app/site-content";
import { aiEnabledTasksVideo } from "@/app/video-content";
import {
  serviceCategoryBySlug,
  serviceCategories,
  type ServiceCategory,
  type ServiceCategorySlug,
} from "@/app/services-content";
import {
  attendanceLeaveModule,
  fieldTrackingModule,
  hrHiringModule,
  hrModuleOverview,
  hrServicesSection,
  type HrServicesModule,
} from "@/app/hr-module-content";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/services-page.css";
import { VideoEmbed } from "@/components/marketing/video-embed";

const categoryIcons: Record<
  ServiceCategorySlug,
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
  automation: { icon: Wrench, tone: "tone-slate" },
};

const hrModuleIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  "attendance-leave": { icon: CalendarCheck, tone: "tone-sky" },
  "field-tracking": { icon: MapPin, tone: "tone-emerald" },
  hiring: { icon: UserRoundSearch, tone: "tone-indigo" },
};

function HrModulePanel({ mod }: { mod: HrServicesModule }) {
  const meta = hrModuleIcons[mod.id] ?? hrModuleIcons["attendance-leave"];
  const Icon = meta.icon;

  return (
    <article className="services-hr-module-panel">
      <div className="services-hr-module-panel-head">
        <span className={`marketing-icon lg ${meta.tone}`} aria-hidden>
          <Icon size={24} strokeWidth={2} />
        </span>
        <div>
          <h3>{mod.name}</h3>
          <p className="services-hr-module-tagline">{mod.tagline}</p>
        </div>
      </div>

      <ul className="services-hr-module-features">
        {mod.marketingFeatures.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={18} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {mod.darwinboxParity && mod.darwinboxParity.length > 0 ? (
        <div className="services-hr-parity">
          <p className="services-hr-parity-label">Enterprise-grade patterns</p>
          <ul>
            {mod.darwinboxParity.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="services-hr-module-actions">
        <ContactButtons
          className="services-hr-card-v2-contact"
          whatsappClassName="services-hr-card-v2-cta services-hr-card-v2-cta-whatsapp"
          whatsappLabel={mod.ctaLabel}
          callClassName="services-hr-card-v2-cta services-hr-card-v2-cta-call"
          callLabel="Call our team"
          message={mod.whatsappMessage}
        />
        <MarketingLinkButton href={mod.marketingHref} variant="secondary">
          <span>Module details</span>
          <ArrowRight size={16} aria-hidden />
        </MarketingLinkButton>
        <MarketingLinkButton href={mod.workspacePath} variant="secondary">
          <span>Open in workspace</span>
          <ArrowRight size={16} aria-hidden />
        </MarketingLinkButton>
      </div>
    </article>
  );
}

function GenericServiceDetail({ category }: { category: ServiceCategory }) {
  const meta = categoryIcons[category.slug];
  const Icon = meta.icon;

  return (
    <>
      <section className="services-detail-hero">
        <div className="services-detail-hero-inner mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <ServicesBreadcrumb
            items={[
              { label: "Services", href: "/services" },
              { label: category.name },
            ]}
          />
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
              <ContactButtons
                whatsappLabel={category.ctaLabel}
                callLabel="Call now"
                message={category.whatsappMessage}
              />
              {category.workspaceHref ? (
                <MarketingLinkButton
                  href={category.workspaceHref}
                  variant="secondary"
                >
                  <span>{category.workspaceCta ?? "Learn more"}</span>
                  <ArrowRight size={18} aria-hidden />
                </MarketingLinkButton>
              ) : null}
            </div>
          </div>

          <aside className="services-detail-problem-card">
            <span className="services-ps-label">Problem</span>
            <h2>{category.problem}</h2>
            <p>{category.problemDetail}</p>
            <span className={`marketing-icon lg ${meta.tone}`} aria-hidden>
              <Icon size={24} strokeWidth={2} />
            </span>
          </aside>
        </div>
      </section>

      {category.slug === "tasks" ? (
        <section className="services-detail-video" aria-label="AI Enabled Tasks demo">
          <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
            <VideoEmbed video={aiEnabledTasksVideo} variant="featured" />
          </div>
        </section>
      ) : null}

      <section className="services-detail-features">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="services-section-head services-section-head-center">
            <p className="services-section-eyebrow">What you get</p>
            <h2 className="services-section-title">Built end to end</h2>
            <p className="services-section-lead">
              Scoped on one call, delivered with AI wired in  -  not bolted on
              later.
            </p>
          </div>

          <div className="services-detail-feature-grid">
            {category.features.map((feature, index) => (
              <article className="services-detail-feature-card" key={feature.title}>
                <span className="services-detail-feature-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="services-detail-outcomes">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <div className="services-detail-outcomes-box">
            <h2>Outcomes owners care about</h2>
            <ul>
              {category.outcomes.map((outcome) => (
                <li key={outcome}>
                  <CheckCircle2 size={20} aria-hidden />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
            <ContactButtons
              className="services-detail-outcomes-cta"
              whatsappClassName="btn-block"
              whatsappLabel={whatsappDisplayNumber}
              callClassName="btn-block"
              callLabel="Call now"
              message={category.whatsappMessage}
            />
          </div>
        </div>
      </section>

      <RelatedServicesSection
        className="services-detail-related"
        relatedSlugs={category.relatedSlugs ?? []}
      />
    </>
  );
}

function HrServiceDetail({ category }: { category: ServiceCategory }) {
  return (
    <>
      <section className="services-detail-hero services-hr-hero">
        <div className="services-detail-hero-inner mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <ServicesBreadcrumb
            items={[
              { label: "Services", href: "/services" },
              { label: category.name },
            ]}
          />
          <div className="services-detail-hero-copy">
            <p className="services-hero-kicker type-kicker text-sky-700">
              {hrModuleOverview.eyebrow}
            </p>
            <h1 className="services-hero-title">
              {category.title}{" "}
              <span className="services-hero-accent">{category.titleAccent}</span>
            </h1>
            <p className="services-hero-lead">{hrModuleOverview.lead}</p>
            <div className="services-hero-actions marketing-actions">
              <ContactButtons
                whatsappLabel={category.ctaLabel}
                callLabel="Call now"
                message={category.whatsappMessage}
              />
              <MarketingLinkButton
                href={category.workspaceHref ?? "/login?callbackUrl=%2Fapp%2Fhr"}
                variant="secondary"
              >
                <span>{category.workspaceCta ?? "Open HR workspace"}</span>
                <ArrowRight size={18} aria-hidden />
              </MarketingLinkButton>
            </div>
          </div>

          <aside className="services-hr-context-card">
            <p className="services-hr-context-label">Why MSMEs choose this</p>
            <p className="services-hr-context-text">{hrModuleOverview.darwinboxNote}</p>
            <ul className="services-hr-context-stats">
              {category.outcomes.map((outcome) => (
                <li key={outcome}>
                  <CheckCircle2 size={16} aria-hidden />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="services-hr-modules-detail">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="services-section-head services-section-head-center">
            <p className="services-section-eyebrow">{hrServicesSection.eyebrow}</p>
            <h2 className="services-section-title">{hrServicesSection.title}</h2>
            <p className="services-section-lead">{hrServicesSection.subcopy}</p>
          </div>

          <div className="services-hr-modules-stack">
            {[attendanceLeaveModule, fieldTrackingModule, hrHiringModule].map(
              (mod) => (
                <HrModulePanel key={mod.id} mod={mod} />
              ),
            )}
          </div>

          <div className="services-hr-footnote services-hr-footnote-detail">
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

      <section className="services-hr-cta-band">
        <div className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-8">
          <h2>Ready to scope HR for your team?</h2>
          <p>
            We enable modules per organization after a short call  -  attendance
            first, field or hiring when you are ready.
          </p>
          <ContactButtons
            className="mx-auto mt-6 max-w-sm"
            whatsappClassName="btn-block"
            whatsappLabel={whatsappDisplayNumber}
            callClassName="btn-block"
            callLabel="Call now"
            message={category.whatsappMessage}
          />
        </div>
      </section>
    </>
  );
}

export function ServiceDetailContent({ slug }: { slug: ServiceCategorySlug }) {
  const category = serviceCategoryBySlug[slug];
  const isHr = slug === "hr";

  return (
    <MarketingPage>
      <div className="services-page">
        <SiteHeader />
        <ServicesSubNav currentSlug={slug} />

        {isHr ? (
          <HrServiceDetail category={category} />
        ) : (
          <GenericServiceDetail category={category} />
        )}

        <FinalCta />
        <SiteFooter />
      </div>
    </MarketingPage>
  );
}

export function getAllServiceSlugs(): ServiceCategorySlug[] {
  return serviceCategories.map((c) => c.slug);
}
