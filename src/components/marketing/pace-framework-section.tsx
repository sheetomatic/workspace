import Link from "next/link";
import {
  buildManageScale,
  paceFramework,
} from "@/app/sales-framework-content";
import { ArrowRightIcon } from "@/components/marketing/marketing-icons";
import "./pace-framework.css";

export function PaceFrameworkSection() {
  return (
    <section
      aria-labelledby="pace-framework-title"
      className="section pace-section"
      id="pace-framework"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>{paceFramework.eyebrow}</p>
          <h2 id="pace-framework-title">{paceFramework.title}</h2>
          <div className="section-subcopy">{paceFramework.lead}</div>
        </div>

        <div className="pace-pillars-grid">
          {paceFramework.pillars.map((pillar) => (
            <article className="pace-pillar-card" key={pillar.letter}>
              <span className="pace-pillar-letter">{pillar.letter}</span>
              <h3>{pillar.title}</h3>
              <p className="pace-pillar-problem">{pillar.problem}</p>
              <p className="pace-pillar-solution">{pillar.sheetomaticSolution}</p>
              <Link className="pace-pillar-link" href={pillar.moduleHref}>
                <span>{pillar.moduleLabel}</span>
                <ArrowRightIcon size={16} aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <div className="pace-bms-band">
          <div className="pace-bms-heading">
            <p>{buildManageScale.eyebrow}</p>
            <h3>{buildManageScale.title}</h3>
            <p className="pace-bms-lead">{buildManageScale.lead}</p>
          </div>

          <div className="pace-bms-phases">
            {buildManageScale.phases.map((phase) => (
              <article className="pace-bms-phase" key={phase.phase}>
                <span className="pace-bms-phase-tag">{phase.phase}</span>
                <h4>{phase.title}</h4>
                <p>{phase.text}</p>
                <ul className="pace-bms-modules">
                  {phase.modules.map((module) => (
                    <li key={module}>{module}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
