import Link from "next/link";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canManageFms } from "@/lib/fms/access";
import { listFmsForms, listFmsInstances } from "@/lib/fms/queries";

export default async function FmsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const isAdmin = canManageFms(user.role);

  const [forms, instances] = await Promise.all([
    listFmsForms(user.organizationId),
    listFmsInstances(user.organizationId),
  ]);

  const activeJobs = instances.filter((job) => job.status === "ACTIVE");
  const liveForms = forms.filter((form) => form.status === "ACTIVE");
  const totalSubmissions = forms.reduce((sum, form) => sum + form._count.submissions, 0);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="FMS"
        description="Build intake forms, link workflow steps with owners and TAT, and track jobs from submission to completion."
        actions={
          isAdmin ? (
            <Link href="/app/fms/forms/new" className="btn-primary ws-sf-btn-primary">
              + New form
            </Link>
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
          <span>Active jobs</span>
          <strong>{activeJobs.length}</strong>
          <span className="ws-stat-card-hint">In pipeline</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Submissions</span>
          <strong>{totalSubmissions}</strong>
          <span className="ws-stat-card-hint">All time</span>
        </div>
      </div>

      <div className="ws-fms-dashboard-grid">
        <section className="ws-sf-list-view" aria-label="Forms">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Forms</h2>
              <span className="ws-sf-list-view-count">
                {forms.length} item{forms.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          {forms.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state">
              <p>No forms yet. Create an intake form, then attach a workflow with steps and owners.</p>
              {isAdmin ? (
                <Link href="/app/fms/forms/new" className="btn-primary btn-sm ws-sf-btn-primary">
                  Create first form
                </Link>
              ) : null}
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
                          <Link
                            href={`/app/fms/forms/${form.id}`}
                            className="ws-sf-record-link"
                          >
                            {form.name}
                          </Link>
                        </td>
                        <td>
                          <FmsStatusBadge status={form.status} />
                        </td>
                        <td className="ws-fms-table-meta">
                          {form.template ? form.template.name : "No FMS yet"}
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

        <section className="ws-sf-list-view" aria-label="Active jobs">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Active jobs</h2>
              <span className="ws-sf-list-view-count">
                {activeJobs.length} item{activeJobs.length === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          {activeJobs.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state">
              <p>No active FMS jobs. Submit a live form to start a pipeline.</p>
            </div>
          ) : (
            <div className="ws-sf-table-wrap">
              <div className="ws-fms-table-scroll">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Workflow</th>
                      <th>Current step</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeJobs.map((job) => {
                      const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
                      return (
                        <tr key={job.id}>
                          <td>
                            <Link
                              href={`/app/fms/instances/${job.id}`}
                              className="ws-sf-record-link"
                            >
                              {job.referenceLabel ?? job.template.name}
                            </Link>
                          </td>
                          <td className="ws-fms-table-meta">{job.template.name}</td>
                          <td className="ws-fms-table-meta">
                            {current ? current.step.stepName : "Awaiting next step"}
                          </td>
                          <td>
                            <FmsStatusBadge status={job.status} />
                          </td>
                        </tr>
                      );
                    })}
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
