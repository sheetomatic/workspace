import Link from "next/link";
import { FmsSetupItemCard } from "@/components/saas/fms-setup-item-card";
import { FmsDescribeProcessLink } from "@/components/saas/fms-describe-process-link";
import { FmsOnboardingChecklist } from "@/components/saas/fms-onboarding-checklist";
import { FmsPipelineStatusBadge } from "@/components/saas/fms-pipeline-status-badge";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import {
  listFmsForms,
  listFmsFlowDesigns,
  listPendingFmsFlowDesigns,
  getFmsOnboardingStatus,
} from "@/lib/fms/queries";
import { redirect } from "next/navigation";

export default async function FmsSetupPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const canDesign = canSubmitFmsFlow(user.role);
  const isOwner = canApproveFmsFlow(user.role);

  if (!canDesign && !isOwner) {
    redirect("/app/fms/my-stops");
  }

  const [forms, flowDesigns, pendingDesigns, onboarding] = await Promise.all([
    listFmsForms(user.organizationId),
    listFmsFlowDesigns(user.organizationId),
    isOwner ? listPendingFmsFlowDesigns(user.organizationId) : Promise.resolve([]),
    getFmsOnboardingStatus(user.organizationId),
  ]);

  const liveForms = forms.filter((form) => form.status === "ACTIVE");
  const totalSubmissions = forms.reduce((sum, form) => sum + form._count.submissions, 0);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Setup"
        description="AI-powered flow design, forms, and workflow launch."
      />

      <FmsOnboardingChecklist status={onboarding} />

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
          <ul className="ws-fms-setup-list">
            {pendingDesigns.map((design) => (
              <FmsSetupItemCard
                key={design.id}
                href={`/app/fms/design/${design.id}`}
                title={design.name}
                subtitle={
                  <>
                    Submitted by {design.createdBy.name ?? design.createdBy.email}
                    {" · "}
                    {design.submittedAt
                      ? new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(design.submittedAt)
                      : "-"}
                  </>
                }
                trailing={
                  <span className="btn-primary btn-sm ws-sf-btn-primary">
                    Review
                  </span>
                }
              />
            ))}
          </ul>
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
            <ul className="ws-fms-setup-list">
              {flowDesigns.map((design) => (
                <FmsSetupItemCard
                  key={design.id}
                  href={`/app/fms/design/${design.id}`}
                  title={design.name}
                  subtitle={
                    design.form ? (
                      <>
                        Live FMS: {design.form.name}
                      </>
                    ) : (
                      <span className="ws-fms-muted">Not created yet</span>
                    )
                  }
                  badges={<FmsStatusBadge status={design.status} />}
                />
              ))}
            </ul>
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
            <ul className="ws-fms-setup-list">
              {forms.map((form) => (
                <FmsSetupItemCard
                  key={form.id}
                  href={`/app/fms/forms/${form.id}`}
                  title={form.name}
                  subtitle={
                    <>
                      {form.template ? form.template.name : (
                        <span className="ws-fms-muted">No workflow</span>
                      )}
                      {" · "}
                      {form._count.submissions} submission
                      {form._count.submissions === 1 ? "" : "s"}
                    </>
                  }
                  badges={
                    <FmsPipelineStatusBadge
                      formStatus={form.status}
                      workflowStatus={form.template?.status}
                    />
                  }
                  secondaryAction={
                    form.status === "ACTIVE" ? (
                      <Link
                        href={`/app/fms/forms/${form.id}/submit`}
                        className="btn-secondary btn-sm ws-fms-setup-submit"
                      >
                        Submit
                      </Link>
                    ) : undefined
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
