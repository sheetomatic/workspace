import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import type { HrServicesModule } from "@/app/hr-module-content";
import { ContactButtons } from "@/components/marketing/marketing-buttons";

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

type HrModuleCardProps = {
  mod: HrServicesModule;
  variant?: "hub" | "category";
};

export function HrModuleCard({ mod, variant = "hub" }: HrModuleCardProps) {
  const meta = hrModuleIcons[mod.id] ?? hrModuleIcons["attendance-leave"];
  const Icon = meta.icon;

  return (
    <article className={`services-hr-card-v2 ${meta.accent}${variant === "category" ? " compact" : ""}`}>
      <div className="services-hr-card-v2-accent" aria-hidden />
      <div className="services-hr-card-v2-body">
        <div className="services-hr-card-v2-head">
          <span className={`marketing-icon md ${meta.tone}`} aria-hidden>
            <Icon size={22} strokeWidth={2} />
          </span>
          <div className="services-hr-card-v2-titles">
            <Link className="services-hr-card-v2-title-link" href={mod.marketingHref}>
              <h3>{mod.name}</h3>
            </Link>
            <p className="services-hr-card-v2-tagline">{mod.tagline}</p>
          </div>
        </div>

        <ul className="services-hr-card-v2-features">
          {mod.marketingFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>

        <div className="services-hr-card-v2-actions">
          <Link className="services-hr-card-v2-explore" href={mod.marketingHref}>
            <span>View module details</span>
            <ArrowRight size={16} aria-hidden />
          </Link>
          <ContactButtons
            className="services-hr-card-v2-contact"
            whatsappClassName="services-hr-card-v2-cta services-hr-card-v2-cta-whatsapp"
            whatsappLabel={mod.ctaLabel}
            callClassName="services-hr-card-v2-cta services-hr-card-v2-cta-call"
            callLabel="Call our team"
            message={mod.whatsappMessage}
          />
        </div>
      </div>
    </article>
  );
}
