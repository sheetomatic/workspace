import "./usp-section.css";
import { uspSection } from "@/app/marketing-content";
import {
  BarChart3,
  ClipboardCheck,
  ListTodo,
  Package,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const uspIconMap: Record<string, LucideIcon> = {
  workflow: Workflow,
  inventory: Package,
  performance: BarChart3,
  delegation: ListTodo,
  checklist: ClipboardCheck,
};

function UspSystemCard({
  acronym,
  name,
  text,
  icon,
  featured = false,
}: {
  acronym: string;
  name: string;
  text: string;
  icon: string;
  featured?: boolean;
}) {
  const Icon = uspIconMap[icon] ?? Workflow;

  return (
    <article className={`usp-system-card ${featured ? "featured" : ""}`}>
      <span className="usp-acronym">{acronym}</span>
      <span className="usp-system-icon" aria-hidden>
        <Icon size={22} />
      </span>
      <h3>{name}</h3>
      <p>{text}</p>
    </article>
  );
}

function UspRolePortalCard({
  name,
  role,
  text,
  icon,
}: {
  name: string;
  role: string;
  text: string;
  icon: string;
}) {
  const Icon = uspIconMap[icon] ?? Workflow;

  return (
    <article className="usp-system-card usp-role-portal-card">
      <span className="usp-role-badge">{role}</span>
      <span className="usp-system-icon" aria-hidden>
        <Icon size={22} />
      </span>
      <h3>{name}</h3>
      <p>{text}</p>
    </article>
  );
}

export function UspSection() {
  const section = uspSection;

  return (
    <section className="section bg-white" id="usp">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <div className="section-subcopy">{section.subcopy}</div>
        </div>

        <div className="usp-systems-grid">
          {section.systems.map((system) => (
            <UspSystemCard
              key={system.name}
              acronym={system.acronym}
              name={system.name}
              text={system.text}
              icon={system.icon}
              featured={system.acronym === "EM"}
            />
          ))}
        </div>

        <div className="usp-role-portals">
          <div className="usp-role-portals-heading">
            <h3>{section.rolePortals.heading}</h3>
            {section.rolePortals.subheading ? (
              <p>{section.rolePortals.subheading}</p>
            ) : null}
          </div>

          <div className="usp-role-portals-grid">
            {section.rolePortals.items.map((portal) => (
              <UspRolePortalCard
                key={portal.name}
                name={portal.name}
                role={portal.role}
                text={portal.text}
                icon={portal.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
