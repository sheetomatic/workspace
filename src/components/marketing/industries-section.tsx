import "./industries-outcomes.css";
import { industriesSection } from "@/app/marketing-content";
import {
  Briefcase,
  Building2,
  Factory,
  GraduationCap,
  Plane,
  Stethoscope,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";

const industryIconMap: Record<string, LucideIcon> = {
  factory: Factory,
  store: Store,
  truck: Truck,
  briefcase: Briefcase,
  stethoscope: Stethoscope,
  building: Building2,
  plane: Plane,
  "graduation-cap": GraduationCap,
};

export function IndustriesSection() {
  const section = industriesSection;

  return (
    <section className="section soft-section" id="industries">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <div className="section-subcopy">{section.subcopy}</div>
        </div>
        <div className="industries-grid">
          {section.items.map((industry) => {
            const Icon = industryIconMap[industry.icon] ?? Briefcase;

            return (
              <article className="industry-card" key={industry.name}>
                <span className="industry-card-icon" aria-hidden>
                  <Icon size={22} />
                </span>
                <h3>{industry.name}</h3>
                <p>{industry.note}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
