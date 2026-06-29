import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MapPin,
  UserRoundSearch,
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
import { ServicesBreadcrumb } from "@/components/marketing/services-breadcrumb";
import { ServicesSubNav } from "@/components/marketing/services-sub-nav";
import {
  hrModuleById,
  hrWorkspaceModules,
  type HrModuleSlug,
  type HrServicesModule,
} from "@/app/hr-module-content";
import { serviceCategoryBySlug } from "@/app/services-content";
import { whatsappDisplayNumber } from "@/app/site-content";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/services-page.css";

const hrModuleIcons: Record<
  string,
  { icon: LucideIcon; tone: string; accent: string }
> = {
  "attendance-leave": {
    icon: CalendarCheck,
    tone: "tone-sky",
    accent: "accent-sky",
  },
  "field-tracking": {
    icon: MapPin,
    tone: "tone-emerald",
    accent: "accent-emerald",
  },
  hiring: {
    icon: UserRoundSearch,
    tone: "tone-indigo",
    accent: "accent-indigo",
  },
};

type HrServiceDetailContentProps = {
  moduleSlug: HrModuleSlug;
};

export function HrServiceDetailContent({ moduleSlug }: HrServiceDetailContentProps) {
  const mod = hrModuleById[moduleSlug];
  const meta = hrModuleIcons[mod.id] ?? hrModuleIcons["attendance-leave"];
  const Icon = meta.icon;
  const hrCategory = serviceCategoryBySlug.hr;
  const otherModules = hrWorkspaceModules.filter((item) => item.id !== mod.id);

  return (
    <MarketingPage>
      <div className="services-page">
        <SiteHeader />
        <ServicesSubNav currentSlug="hr" />

        <section className={`services-detail-hero services-hr-detail-hero ${meta.accent}`}>
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
            <ServicesBreadcrumb
              items={[
                { label: "Services", href: "/services" },
                { label: "HR & workforce", href: "/services/hr" },
                { label: mod.name },
              ]}
            />

            <div className="services-hr-detail-head">
              <span className={`marketing-icon lg ${meta.tone}`} aria-hidden>
                <Icon size={28} strokeWidth={2} />
              </span>
              <div>
                <p className="services-hero-kicker type-kicker text-sky-700">
                  HR module
                </p>
                <h1 className="services-hero-title">{mod.name}</h1>
                <p className="services-hr-detail-tagline">{mod.tagline}</p>
                <p className="services-hero-lead">{mod.heroLead}</p>
                <div className="services-hero-actions marketing-actions">
                  <WhatsAppButton
                    label={mod.ctaLabel}
                    message={mod.whatsappMessage}
                  />
                  <MarketingLinkButton
                    href={mod.workspacePath}
                    variant="secondary"
                  >
                    <span>Open in workspace</span>
                    <ArrowRight size={18} aria-hidden />
                  </MarketingLinkButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="services-detail-features">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="services-section-head">
              <p className="services-section-eyebrow">Capabilities</p>
              <h2 className="services-section-title">
                Everything included in {mod.name}
              </h2>
            </div>

            <ul className="services-hr-detail-feature-list">
              {mod.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={18} aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {mod.darwinboxParity && mod.darwinboxParity.length > 0 ? (
              <aside className="services-hr-parity-panel">
                <p className="services-hr-parity-label">Enterprise-grade patterns</p>
                <p className="services-hr-parity-text">
                  Same ideas as enterprise HCM platforms  -  scoped for Indian MSME
                  teams with WhatsApp-ready ops and Executive Meeting (Weekly) reporting.
                </p>
                <ul className="services-hr-parity-list">
                  {mod.darwinboxParity.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </section>

        <section className="services-process-compact">
          <div className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
            <div className="services-section-head services-section-head-center">
              <p className="services-section-eyebrow">Implementation</p>
              <h2 className="services-section-title">
                Three steps to go live
              </h2>
            </div>
            <ol className="services-process-row">
              {mod.processSteps.map((step) => (
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
                Scope {mod.name.toLowerCase()} on a short WhatsApp call
              </p>
              <div className="contact-actions centered cta-stack">
                <WhatsAppButton
                  className="btn-block"
                  label={whatsappDisplayNumber}
                  message={mod.whatsappMessage}
                />
              </div>
            </div>
          </div>
        </section>

        {otherModules.length > 0 ? (
          <section className="services-related">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
              <div className="services-section-head">
                <p className="services-section-eyebrow">Other HR modules</p>
                <h2 className="services-section-title">
                  Explore the full {hrCategory.name.toLowerCase()} stack
                </h2>
              </div>
              <div className="services-related-grid">
                {otherModules.map((item: HrServicesModule) => {
                  const otherMeta =
                    hrModuleIcons[item.id] ?? hrModuleIcons["attendance-leave"];
                  const OtherIcon = otherMeta.icon;
                  return (
                    <Link
                      className="services-related-card"
                      href={item.marketingHref}
                      key={item.id}
                    >
                      <span
                        className={`marketing-icon sm ${otherMeta.tone}`}
                        aria-hidden
                      >
                        <OtherIcon size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.tagline}</p>
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
            <Link className="services-back-link" href="/services/hr">
              <ArrowLeft size={16} aria-hidden />
              <span>Back to HR & workforce</span>
            </Link>
          </div>
        </div>

        <FinalCta />
        <SiteFooter />
      </div>
    </MarketingPage>
  );
}

export function getHrModuleStaticParams() {
  return hrWorkspaceModules.map((mod) => ({ moduleSlug: mod.id }));
}
