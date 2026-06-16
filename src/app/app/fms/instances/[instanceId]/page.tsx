import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsInstanceTimeline } from "@/components/saas/fms-instance-timeline";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsStepCompletePanel } from "@/components/saas/fms-step-complete-panel";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canManageFms } from "@/lib/fms/access";
import { getFmsInstance } from "@/lib/fms/queries";

type PageProps = {
  params: Promise<{ instanceId: string }>;
};

export default async function FmsInstancePage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { instanceId } = await params;
  const instance = await getFmsInstance(instanceId, user.organizationId);

  if (!instance) {
    notFound();
  }

  const isAdmin = canManageFms(user.role);
  const activeStep = instance.stepStates.find((s) => s.status === "IN_PROGRESS");
  const canComplete =
    Boolean(activeStep) &&
    (isAdmin ||
      activeStep?.ownerUserId === user.id ||
      activeStep?.ownerUserId === null);

  const submissionValues = instance.submission?.values as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title={instance.referenceLabel ?? instance.template.name}
        description={`${instance.template.name} / Job pipeline`}
        actions={
          <Link href="/app/fms" className="btn-secondary btn-sm">
            Back to FMS
          </Link>
        }
      />

      <div className="ws-fms-detail-meta">
        <FmsStatusBadge status={instance.status} />
        {activeStep ? (
          <span className="ws-fms-muted">
            Current step: <strong>{activeStep.step.stepName}</strong>
          </span>
        ) : (
          <span className="ws-fms-muted">No step in progress</span>
        )}
      </div>

      <div className="ws-fms-instance-layout">
        {submissionValues && Object.keys(submissionValues).length > 0 ? (
          <section className="ws-sf-card ws-fms-section">
            <header className="ws-fms-section-heading">
              <h2>Form submission</h2>
              <p>Values captured when this job was started.</p>
            </header>
            <dl className="ws-fms-submission-grid">
              {instance.template.form.fields.map((field) => {
                const value = submissionValues[field.fieldKey];
                const display = Array.isArray(value)
                  ? value.join(", ")
                  : value === null || value === undefined
                    ? "-"
                    : String(value);
                return (
                  <div key={field.id}>
                    <dt>{field.label}</dt>
                    <dd>{display}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}

        {activeStep ? (
          <FmsStepCompletePanel stepState={activeStep} canComplete={canComplete} />
        ) : null}

        <section className="ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>Pipeline timeline</h2>
            <p>Planned vs actual completion with delay indicators.</p>
          </header>
          <FmsInstanceTimeline steps={instance.stepStates} />
        </section>
      </div>
    </div>
  );
}
