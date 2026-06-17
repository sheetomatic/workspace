import Link from "next/link";
import { FMS_WORKFLOW_TEMPLATES } from "@/lib/fms/workflow-templates";

export function FmsWorkflowTemplatePicker() {
  return (
    <section className="ws-sf-card ws-fms-template-picker" aria-label="Workflow templates">
      <header className="ws-fms-section-heading">
        <h2>Start from a template</h2>
        <p>Pre-built routes for common client workflows. Customize steps after loading.</p>
      </header>
      <ul className="ws-fms-template-grid">
        {FMS_WORKFLOW_TEMPLATES.map((template) => (
          <li key={template.id}>
            <Link
              href={`/app/fms/design/new?template=${template.id}`}
              className="ws-fms-template-card"
            >
              <strong>{template.name}</strong>
              <span>{template.description}</span>
              <span className="ws-fms-muted">{template.steps.length} stops</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
