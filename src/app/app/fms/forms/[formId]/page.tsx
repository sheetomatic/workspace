import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsFormBuilder } from "@/components/saas/fms-form-builder";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsTemplateBuilder } from "@/components/saas/fms-template-builder";
import { requireSession } from "@/lib/require-session";
import { canManageFms } from "@/lib/fms/access";
import { getFmsForm } from "@/lib/fms/queries";
import { listAssignableMembers } from "@/lib/tasks";

type PageProps = {
  params: Promise<{ formId: string }>;
};

export default async function FmsFormDetailPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { formId } = await params;
  const form = await getFmsForm(formId, user.organizationId);

  if (!form) {
    notFound();
  }

  const isAdmin = canManageFms(user.role);
  const members = isAdmin
    ? await listAssignableMembers(user.organizationId)
    : [];

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-jotform-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms" className="ws-fms-jf-back">
          Back to FMS
        </Link>
        <div className="ws-fms-jf-page-meta">
          <FmsStatusBadge status={form.status} />
          {form.status === "ACTIVE" ? (
            <Link
              href={`/app/fms/forms/${form.id}/submit`}
              className="btn-primary btn-sm ws-sf-btn-primary"
            >
              Submit form
            </Link>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <>
          <FmsFormBuilder
            formId={form.id}
            initialName={form.name}
            initialDescription={form.description ?? ""}
            initialFields={form.fields}
            mode="edit"
          />

          <section className="ws-fms-section ws-fms-jf-workflow">
            {form.template ? (
              <>
                <div className="ws-sf-card ws-fms-summary">
                  <div className="ws-fms-summary-header">
                    <strong>{form.template.name}</strong>
                    <FmsStatusBadge status={form.template.status} />
                  </div>
                  <p className="ws-fms-muted">
                    {form.template.steps.length} step
                    {form.template.steps.length === 1 ? "" : "s"} configured
                  </p>
                  <ol className="ws-fms-step-summary">
                    {form.template.steps.map((step, index) => (
                      <li key={step.id}>
                        <span className="ws-fms-step-index">{index + 1}</span>
                        <span>
                          {step.stepName}
                          {step.roleLabel ? ` (${step.roleLabel})` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <FmsTemplateBuilder
                  formId={form.id}
                  templateId={form.template.id}
                  initialName={form.template.name}
                  initialSteps={form.template.steps}
                  members={members}
                  mode="edit"
                />
              </>
            ) : (
              <>
                <FmsTemplateBuilder formId={form.id} members={members} mode="create" />
              </>
            )}
          </section>
        </>
      ) : (
        <section className="ws-sf-list-view ws-fms-readonly-view">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Form fields</h2>
              <span className="ws-sf-list-view-count">
                {form.fields.length} field{form.fields.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {form.fields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.label}</td>
                    <td className="ws-fms-table-meta">
                      {field.fieldType.toLowerCase().replaceAll("_", " ")}
                    </td>
                    <td>{field.required ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {form.status === "ACTIVE" ? (
            <div className="ws-fms-readonly-actions">
              <Link href={`/app/fms/forms/${form.id}/submit`} className="btn-primary ws-sf-btn-primary">
                Submit this form
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
