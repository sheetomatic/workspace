import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsTrainTrack } from "@/components/saas/fms-train-track";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsStepCompletePanel } from "@/components/saas/fms-step-complete-panel";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canManageFms } from "@/lib/fms/access";
import { getFmsInstance } from "@/lib/fms/queries";
import { fmsJobMisScore, fmsStepMisScore } from "@/lib/mis/score";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

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

  const activeDelay = activeStep
    ? liveDelayMinutes(
        activeStep.plannedAt,
        activeStep.actualAt,
        activeStep.delayMinutes,
      )
    : null;
  const activeDelayLabel = formatDelayLabel(activeDelay);
  const activeOverdue = activeStep
    ? isStepOverdue(
        activeStep.status,
        activeStep.plannedAt,
        activeStep.actualAt,
        activeStep.delayMinutes,
      )
    : false;

  const submissionValues = instance.submission?.values as
    | Record<string, unknown>
    | undefined;

  const completedCount = instance.stepStates.filter((s) => s.status === "DONE").length;
  const jobScore = fmsJobMisScore(instance.stepStates);
  const currentScore = activeStep ? fmsStepMisScore(activeStep) : null;

  const trainStops = instance.stepStates.map((s) => ({
    id: s.id,
    name: s.step.stepName,
    status: s.status,
    plannedAt: s.plannedAt,
    actualAt: s.actualAt,
    delayMinutes: s.delayMinutes,
    ownerName: s.owner?.name ?? s.owner?.email.split("@")[0] ?? null,
  }));

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title={instance.referenceLabel ?? instance.template.name}
        description={`${instance.template.name} | ${completedCount}/${instance.stepStates.length} stops passed`}
        actions={
          <Link href="/app/fms/lines" className="btn-secondary btn-sm">
            Back to pipelines
          </Link>
        }
      />

      <section className="ws-sf-card ws-fms-journey-hero">
        <header className="ws-fms-journey-header">
          <div>
            <p className="ws-fms-journey-eyebrow">Live route</p>
            <h2>
              {activeStep
                ? `Stopped at: ${activeStep.step.stepName}`
                : instance.status === "COMPLETED"
                  ? "Completed"
                  : "Awaiting next stop"}
            </h2>
          </div>
          <div className="ws-fms-journey-badges">
            <MisScoreBadge score={jobScore} />
            {currentScore ? <MisScoreBadge score={currentScore} compact /> : null}
            <FmsStatusBadge status={instance.status} />
            {activeOverdue && activeDelayLabel ? (
              <span className="ws-sf-badge ws-sf-badge-danger">{activeDelayLabel}</span>
            ) : activeStep?.plannedAt ? (
              <span className="ws-sf-badge ws-sf-badge-info">On track</span>
            ) : null}
          </div>
        </header>

        <FmsTrainTrack
          stops={trainStops}
          startLabel="Form submitted"
          endLabel="Complete"
          showOwner
        />

        {activeStep?.plannedAt ? (
          <p className="ws-fms-journey-due">
            Due at this stop:{" "}
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(activeStep.plannedAt)}
          </p>
        ) : null}
      </section>

      <div className="ws-fms-instance-layout">
        {submissionValues && Object.keys(submissionValues).length > 0 ? (
          <section className="ws-sf-card ws-fms-section">
            <header className="ws-fms-section-heading">
              <h2>Form submission</h2>
              <p>Values captured when this journey started.</p>
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
      </div>
    </div>
  );
}
