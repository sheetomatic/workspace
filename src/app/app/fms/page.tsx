import Link from "next/link";
import { Clock } from "lucide-react";
import { FmsPipelineStatusBadge } from "@/components/saas/fms-pipeline-status-badge";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import { listFmsForms, listFmsInstances, listMyFmsSteps, listFmsFlowDesigns, listPendingFmsFlowDesigns } from "@/lib/fms/queries";
import {
  computeStepUrgency,
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
  urgencyClassName,
} from "@/lib/fms/step-display";

export default async function FmsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const canDesign = canSubmitFmsFlow(user.role);
  const isOwner = canApproveFmsFlow(user.role);

  const [forms, instances, mySteps, flowDesigns, pendingDesigns] = await Promise.all([
    listFmsForms(user.organizationId),
    listFmsInstances(user.organizationId),
    listMyFmsSteps(user.organizationId, user.id),
    canDesign || isOwner ? listFmsFlowDesigns(user.organizationId) : Promise.resolve([]),
    isOwner ? listPendingFmsFlowDesigns(user.organizationId) : Promise.resolve([]),
  ]);

  const activeJobs = instances.filter((job) => job.status === "ACTIVE");
  const liveForms = forms.filter((form) => form.status === "ACTIVE");
  const totalSubmissions = forms.reduce((sum, form) => sum + form._count.submissions, 0);
  const overdueJobs = activeJobs.filter((job) => {
    const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
    if (!current) {
      return false;
    }
    return isStepOverdue(
      current.status,
      current.plannedAt,
      current.actualAt,
      current.delayMinutes,
    );
  });

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="FMS"
        description="Auto workflow designer: describe your process, AI builds steps, you confirm each step owner."
        actions={
          canDesign ? (
            <div className="ws-fms-toolbar-actions">
              <Link href="/app/fms/design/new" className="btn-primary ws-sf-btn-primary">
                + Describe process (AI)
              </Link>
              <Link href="/app/fms/forms/new" className="btn-secondary btn-sm">
                Legacy form builder
              </Link>
            </div>
          ) : undefined
        }
      />

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
                      <Link
                        href={`/app/fms/design/${design.id}`}
                        className="ws-sf-record-link"
                      >
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

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Forms</span>
          <strong>{forms.length}</strong>
          <span className="ws-stat-card-hint">{liveForms.length} live</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Active jobs</span>
          <strong>{activeJobs.length}</strong>
          <span className="ws-stat-card-hint">
            {overdueJobs.length > 0
              ? `${overdueJobs.length} overdue`
              : "In pipeline"}
          </span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>My steps</span>
          <strong>{mySteps.length}</strong>
          <span className="ws-stat-card-hint">Awaiting you</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Submissions</span>
          <strong>{totalSubmissions}</strong>
          <span className="ws-stat-card-hint">All time</span>
        </div>
      </div>

      <div className="ws-fms-dashboard-grid">
        {mySteps.length > 0 ? (
          <section className="ws-sf-list-view ws-fms-my-steps ws-fms-dash-span-full" aria-label="My steps">
            <header className="ws-sf-list-view-header">
              <div className="ws-sf-list-view-title">
                <h2>My steps</h2>
                <span className="ws-sf-list-view-count">
                  {mySteps.length} item{mySteps.length === 1 ? "" : "s"}
                </span>
              </div>
            </header>

            <div className="ws-sf-table-wrap">
              <div className="ws-fms-table-scroll">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Step</th>
                      <th>Planned</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySteps.map((stepState) => {
                      const delay = liveDelayMinutes(
                        stepState.plannedAt,
                        stepState.actualAt,
                        stepState.delayMinutes,
                      );
                      const delayLabel = formatDelayLabel(delay);
                      const overdue = isStepOverdue(
                        stepState.status,
                        stepState.plannedAt,
                        stepState.actualAt,
                        stepState.delayMinutes,
                      );
                      const urgency = computeStepUrgency(
                        stepState.status,
                        stepState.plannedAt,
                      );
                      const urgencyClass = urgencyClassName(urgency);
                      const rowClass = [
                        overdue || urgency !== "normal" ? urgencyClass : "",
                        overdue ? "ws-fms-row-overdue" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const showClock =
                        stepState.status === "IN_PROGRESS" &&
                        stepState.plannedAt &&
                        urgency !== "normal";

                      return (
                        <tr key={stepState.id} className={rowClass || undefined}>
                          <td>
                            <Link
                              href={`/app/fms/instances/${stepState.instanceId}`}
                              className="ws-sf-record-link"
                            >
                              {stepState.instance.referenceLabel ??
                                stepState.instance.template.name}
                            </Link>
                          </td>
                          <td>
                            <span className="ws-fms-step-cell">
                              {showClock ? (
                                <Clock
                                  size={14}
                                  className={`ws-fms-urgency-clock${urgency === "overdue" ? " is-pulsing" : ""}`}
                                  aria-hidden
                                />
                              ) : null}
                              {stepState.step.stepName}
                            </span>
                          </td>
                          <td className="ws-fms-table-meta">
                            {stepState.plannedAt
                              ? new Intl.DateTimeFormat("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(stepState.plannedAt)
                              : "-"}
                          </td>
                          <td>
                            {overdue && delayLabel ? (
                              <span className="ws-sf-badge ws-sf-badge-danger">
                                {delayLabel}
                              </span>
                            ) : (
                              <FmsStatusBadge status={stepState.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

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
                      <th>Form</th>
                      <th>Workflow</th>
                      <th>Current step</th>
                      <th>Owner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeJobs.map((job) => {
                      const current = job.stepStates.find(
                        (s) => s.status === "IN_PROGRESS",
                      );
                      const delay = current
                        ? liveDelayMinutes(
                            current.plannedAt,
                            current.actualAt,
                            current.delayMinutes,
                          )
                        : null;
                      const delayLabel = formatDelayLabel(delay);
                      const overdue = current
                        ? isStepOverdue(
                            current.status,
                            current.plannedAt,
                            current.actualAt,
                            current.delayMinutes,
                          )
                        : false;
                      const ownerName = current?.owner?.name ??
                        current?.owner?.email.split("@")[0] ??
                        "Unassigned";

                      return (
                        <tr
                          key={job.id}
                          className={overdue ? "ws-fms-row-overdue" : undefined}
                        >
                          <td>
                            <Link
                              href={`/app/fms/instances/${job.id}`}
                              className="ws-sf-record-link"
                            >
                              {job.referenceLabel ?? job.template.name}
                            </Link>
                          </td>
                          <td className="ws-fms-table-meta">
                            {job.template.form ? (
                              <Link
                                href={`/app/fms/forms/${job.template.form.id}`}
                                className="ws-sf-record-link"
                              >
                                {job.template.form.name}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="ws-fms-table-meta">{job.template.name}</td>
                          <td className="ws-fms-table-meta">
                            {current ? current.step.stepName : "Awaiting next step"}
                          </td>
                          <td className="ws-fms-table-meta">{ownerName}</td>
                          <td>
                            {overdue && delayLabel ? (
                              <span className="ws-sf-badge ws-sf-badge-danger">
                                {delayLabel}
                              </span>
                            ) : (
                              <FmsStatusBadge status={job.status} />
                            )}
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
              <p>No flowcharts yet. Describe your process by voice or text and AI builds it in seconds.</p>
              {canDesign ? (
                <Link href="/app/fms/design/new" className="btn-primary btn-sm ws-sf-btn-primary">
                  Build with AI
                </Link>
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
                          <Link
                            href={`/app/fms/design/${design.id}`}
                            className="ws-sf-record-link"
                          >
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
                          <div className="ws-fms-table-action-group">
                            <Link
                              href={`/app/fms/design/${design.id}`}
                              className="ws-fms-btn-quiet"
                            >
                              Open
                            </Link>
                            {design.status === "APPROVED" && !design.form ? (
                              <Link
                                href={`/app/fms/design/${design.id}`}
                                className="ws-fms-btn-quiet is-primary"
                              >
                                Create form
                              </Link>
                            ) : null}
                            {design.status === "REJECTED" && canDesign ? (
                              <Link
                                href={`/app/fms/design/${design.id}`}
                                className="ws-fms-btn-quiet"
                              >
                                Edit
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="ws-sf-list-view ws-fms-dash-span-full" aria-label="Forms">
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
              <p>No forms yet. AI builds the flowchart first, then the form and workflow go live on owner approval.</p>
              {canDesign ? (
                <Link href="/app/fms/design/new" className="btn-primary btn-sm ws-sf-btn-primary">
                  Build with AI
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
                          <FmsPipelineStatusBadge
                            formStatus={form.status}
                            workflowStatus={form.template?.status}
                          />
                        </td>
                        <td className="ws-fms-table-meta">
                          {form.template ? (
                            form.template.name
                          ) : (
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
