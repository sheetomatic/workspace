import Link from "next/link";
import { FmsDescribeProcessLink } from "@/components/saas/fms-describe-process-link";
import { FmsPipelineStatusBadge } from "@/components/saas/fms-pipeline-status-badge";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import {
  listFmsForms,
  listFmsFlowDesigns,
  listPendingFmsFlowDesigns,
} from "@/lib/fms/queries";
import { redirect } from "next/navigation";

export default async function FmsSetupPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const canDesign = canSubmitFmsFlow(user.role);
  const isOwner = canApproveFmsFlow(user.role);

  if (!canDesign && !isOwner) {
    redirect("/app/fms/my-stops");
  }

  const [forms, flowDesigns, pendingDesigns] = await Promise.all([
    listFmsForms(user.organizationId),
    listFmsFlowDesigns(user.organizationId),
    isOwner ? listPendingFmsFlowDesigns(user.organizationId) : Promise.resolve([]),
  ]);

  const liveForms = forms.filter((form) => form.status === "ACTIVE");
  const totalSubmissions = forms.reduce((sum, form) => sum + form._count.submissions, 0);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Setup"
        description="Design routes, create forms, and launch workflows."
        actions={
          canDesign ? (
            <div className="ws-fms-toolbar-actions">
              <FmsDescribeProcessLink />
              <Link href="/app/fms/forms/new" className="btn-secondary btn-sm">
                Legacy form builder
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Forms</span>
          <strong>{forms.length}</strong>
          <span className="ws-stat-card-hint">{liveForms.length} live</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Flowcharts</span>
          <strong>{flowDesigns.length}</strong>
          <span className="ws-stat-card-hint">Designs</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Submissions</span>
          <strong>{totalSubmissions}</strong>
          <span className="ws-stat-card-hint">All time</span>
        </div>
      </div>

      {isOwner && pendingDesigns.length > 0 ? (
        <section className="ws-sf-list-view ws-fms-pending-designs" aria-label="Pending flowchart approvals">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Pending flowchart approvals</h2>
              <span className="ws-sf-list-view-count">
                {pendingDesigns.length} item{pendingDesigns.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Flow</th>
                  <th>Submitted by</th>
                  <th>Submitted</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pendingDesigns.map((design) => (
                  <tr key={design.id}>
                    <td>
                      <Link href={`/app/fms/design/${design.id}`} className="ws-sf-record-link">
                        {design.name}
                      </Link>
                    </td>
                    <td className="ws-fms-table-meta">
                      {design.createdBy.name ?? design.createdBy.email}
                    </td>
                    <td className="ws-fms-table-meta">
                      {design.submittedAt
                        ? new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(design.submittedAt)
                        : "-"}
                    </td>
                    <td className="ws-fms-table-actions">
                      <Link
                        href={`/app/fms/design/${design.id}`}
                        className="btn-primary btn-sm ws-sf-btn-primary"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="ws-fms-setup-stack">
        <section className="ws-sf-list-view" aria-label="Flow designs">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Flowchart designs</h2>
              <span className="ws-sf-list-view-count">
                {flowDesigns.length} item{flowDesigns.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          {flowDesigns.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state">
              <p>No flowcharts yet. Describe your process and AI builds the route.</p>
              {canDesign ? (
                <FmsDescribeProcessLink className="btn-sm" />
              ) : null}
            </div>
          ) : (
            <div className="ws-sf-table-wrap">
              <div className="ws-fms-table-scroll">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Flow</th>
                      <th>Status</th>
                      <th>Live FMS</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {flowDesigns.map((design) => (
                      <tr key={design.id}>
                        <td>
                          <Link href={`/app/fms/design/${design.id}`} className="ws-sf-record-link">
                            {design.name}
                          </Link>
                        </td>
                        <td>
                          <FmsStatusBadge status={design.status} />
                        </td>
                        <td className="ws-fms-table-meta">
                          {design.form ? (
                            <Link
                              href={`/app/fms/forms/${design.form.id}`}
                              className="ws-sf-record-link"
                            >
                              {design.form.name}
                            </Link>
                          ) : (
                            <span className="ws-fms-muted">Not created yet</span>
                          )}
                        </td>
                        <td className="ws-fms-table-actions">
                          <Link href={`/app/fms/design/${design.id}`} className="ws-fms-btn-quiet">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="ws-sf-list-view" aria-label="Forms">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Forms & workflows</h2>
              <span className="ws-sf-list-view-count">
                {forms.length} item{forms.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          {forms.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state">
              <p>No forms yet. Build a flowchart first, then the form goes live on owner approval.</p>
            </div>
          ) : (
            <div className="ws-sf-table-wrap">
              <div className="ws-fms-table-scroll">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Form</th>
                      <th>Status</th>
                      <th>Workflow</th>
                      <th>Submissions</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {forms.map((form) => (
                      <tr key={form.id}>
                        <td>
                          <Link href={`/app/fms/forms/${form.id}`} className="ws-sf-record-link">
                            {form.name}
                          </Link>
                        </td>
                        <td>
                          <FmsPipelineStatusBadge
                            formStatus={form.status}
                            workflowStatus={form.template?.status}
                          />
                        </td>
                        <td className="ws-fms-table-meta">
                          {form.template ? form.template.name : (
                            <span className="ws-fms-muted">No workflow</span>
                          )}
                        </td>
                        <td className="ws-fms-table-meta">{form._count.submissions}</td>
                        <td className="ws-fms-table-actions">
                          {form.status === "ACTIVE" ? (
                            <Link
                              href={`/app/fms/forms/${form.id}/submit`}
                              className="btn-secondary btn-sm"
                            >
                              Submit
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
