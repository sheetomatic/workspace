"use client";

import { useMemo, useState } from "react";
import {
  FMS_AI_STARTERS,
  FMS_DEPARTMENTS,
  type FmsDepartmentId,
} from "@/lib/fms/ai-starters";
import { FMS_WORKFLOW_TEMPLATES } from "@/lib/fms/workflow-templates";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function FmsWorkflowTemplatePicker({
  onPickTemplate,
  onPickStarter,
}: {
  onPickTemplate?: (templateId: string) => void;
  onPickStarter?: (starterId: string) => void;
}) {
  const [department, setDepartment] = useState<FmsDepartmentId | "all">("all");
  const inline = Boolean(onPickTemplate || onPickStarter);

  const templates = useMemo(() => {
    if (department === "all") {
      return FMS_WORKFLOW_TEMPLATES;
    }
    return FMS_WORKFLOW_TEMPLATES.filter((t) => t.department === department);
  }, [department]);

  const starters = useMemo(() => {
    if (department === "all") {
      return FMS_AI_STARTERS.slice(0, 6);
    }
    return FMS_AI_STARTERS.filter((s) => s.department === department);
  }, [department]);

  return (
    <div className="ws-fms-template-picker-stack">
      <section className="ws-sf-card ws-fms-ai-setup-hero" aria-label="AI FMS builder">
        <div className="ws-fms-ai-setup-hero-head">
          <div className="ws-fms-ai-setup-hero-mark">
            <SheetomaticAiMark variant="icon" sizes="lg" />
          </div>
          <div className="ws-fms-ai-setup-hero-copy">
            <h2>AI FMS consultant</h2>
            <p>
              Pick a department and process below, or describe your own flow in
              voice or text. AI builds stages, owners, TAT, and the intake form.
            </p>
          </div>
        </div>
        <div className="ws-fms-ai-dept-chips" role="tablist" aria-label="Departments">
          <button
            type="button"
            role="tab"
            className={department === "all" ? "is-active" : undefined}
            aria-selected={department === "all"}
            onClick={() => setDepartment("all")}
          >
            All
          </button>
          {FMS_DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              type="button"
              role="tab"
              className={department === dept.id ? "is-active" : undefined}
              aria-selected={department === dept.id}
              onClick={() => setDepartment(dept.id)}
            >
              {dept.label}
            </button>
          ))}
        </div>
        {starters.length > 0 ? (
          <ul className="ws-fms-ai-starter-grid">
            {starters.map((starter) => (
              <li key={starter.id}>
                {inline ? (
                  <button
                    type="button"
                    className="ws-fms-ai-starter-card"
                    onClick={() => onPickStarter?.(starter.id)}
                  >
                    <strong>{starter.label}</strong>
                    <span>{starter.summary}</span>
                    <span className="ws-fms-ai-starter-cta">
                      <SheetomaticAiMark variant="icon" sizes="sm" />
                      {starter.templateId ? "Use template" : "Build with AI"}
                    </span>
                  </button>
                ) : (
                  <a
                    href={
                      starter.templateId
                        ? `/app/fms/design/new?template=${starter.templateId}`
                        : `/app/fms/design/new?starter=${starter.id}`
                    }
                    className="ws-fms-ai-starter-card"
                  >
                    <strong>{starter.label}</strong>
                    <span>{starter.summary}</span>
                    <span className="ws-fms-ai-starter-cta">
                      <SheetomaticAiMark variant="icon" sizes="sm" />
                      {starter.templateId ? "Use template" : "Build with AI"}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="ws-sf-card ws-fms-template-picker" aria-label="Workflow templates">
        <header className="ws-fms-section-heading">
          <h2>Templates by department</h2>
          <p>Pre-built routes with realistic stages and TAT. Customize after loading.</p>
        </header>
        <ul className="ws-fms-template-grid">
          {templates.map((template) => (
            <li key={template.id}>
              {inline ? (
                <button
                  type="button"
                  className="ws-fms-template-card"
                  onClick={() => onPickTemplate?.(template.id)}
                >
                  <span className="ws-fms-template-dept">
                    {FMS_DEPARTMENTS.find((d) => d.id === template.department)?.label ??
                      template.department}
                  </span>
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                  <span className="ws-fms-muted">{template.steps.length} stops</span>
                </button>
              ) : (
                <a
                  href={`/app/fms/design/new?template=${template.id}`}
                  className="ws-fms-template-card"
                >
                  <span className="ws-fms-template-dept">
                    {FMS_DEPARTMENTS.find((d) => d.id === template.department)?.label ??
                      template.department}
                  </span>
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                  <span className="ws-fms-muted">{template.steps.length} stops</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
