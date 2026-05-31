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

export function UspSection() {
  const section = uspSection;
  const ChecklistIcon = uspIconMap.checklist;

  return (
    <section className="section bg-white" id="usp">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <div className="section-subcopy">{section.subcopy}</div>
        </div>

        <div className="usp-systems-grid">
          {section.systems.map((system) => {
            const Icon = uspIconMap[system.icon] ?? Workflow;

            return (
              <article
                className={`usp-system-card ${system.acronym === "TD" ? "featured" : ""}`}
                key={system.name}
              >
                <span className="usp-acronym">{system.acronym}</span>
                <span className="usp-system-icon" aria-hidden>
                  <Icon size={22} />
                </span>
                <h3>{system.name}</h3>
                <p>{system.text}</p>
              </article>
            );
          })}
        </div>

        <div className="usp-checklist-band">
          <div className="usp-checklist-head">
            <span className="usp-checklist-icon" aria-hidden>
              <ChecklistIcon size={26} />
            </span>
            <div className="usp-checklist-copy">
              <h3>{section.checklistBlock.title}</h3>
              <p>{section.checklistBlock.text}</p>
            </div>
          </div>
          <div className="usp-checklist-areas">
            {section.checklistBlock.areas.map((area) => (
              <article className="usp-checklist-area" key={area.label}>
                <strong>{area.label}</strong>
                <span>{area.note}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
