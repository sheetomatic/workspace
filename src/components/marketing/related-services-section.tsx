import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  Package,
  Wrench,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getServiceDisplayLabel,
  serviceCategoryBySlug,
  type ServiceCategory,
  type ServiceCategorySlug,
} from "@/app/services-content";

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

type RelatedServicesSectionProps = {
  relatedSlugs: ServiceCategorySlug[];
  showBackLink?: boolean;
  className?: string;
};

export function RelatedServicesSection({
  relatedSlugs,
  showBackLink = true,
  className = "services-related",
}: RelatedServicesSectionProps) {
  const related = relatedSlugs
    .map((slug) => serviceCategoryBySlug[slug])
    .filter(Boolean);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="services-section-head">
          <p className="services-section-eyebrow">Related services</p>
          <h2 className="services-section-title">Often scoped together</h2>
          <p className="services-section-lead">
            Most teams add these modules once the first win is live - same
            workspace, one scope call each.
          </p>
        </div>

        <div className="services-related-grid">
          {related.map((item: ServiceCategory) => {
            const meta = categoryIcons[item.slug];
            const Icon = meta.icon;
            return (
              <Link
                className="services-related-card"
                href={`/services/${item.slug}`}
                key={item.slug}
              >
                <div className="services-related-card-top">
                  <span
                    className={`marketing-icon ${meta.tone}`}
                    aria-hidden
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="services-related-card-eyebrow">
                    {item.eyebrow}
                  </span>
                </div>
                <h3 className="services-related-card-title">
                  {getServiceDisplayLabel(item.slug)}
                </h3>
                <p className="services-related-card-benefit">
                  {item.relatedBenefit}
                </p>
                <span className="services-related-card-link">
                  View module
                  <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>

        {showBackLink ? (
          <nav
            className="services-related-footer"
            aria-label="Services navigation"
          >
            <Link className="services-related-back" href="/services">
              <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
              <span>Back to all services</span>
            </Link>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
