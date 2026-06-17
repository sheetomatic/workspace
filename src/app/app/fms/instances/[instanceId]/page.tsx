import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsInstanceActivity } from "@/components/saas/fms-instance-activity";
import { FmsInstanceAttachments } from "@/components/saas/fms-instance-attachments";
import { FmsInstanceControlPanel } from "@/components/saas/fms-instance-control-panel";
import { FmsPipelineCountBadges } from "@/components/saas/fms-pipeline-count-badges";
import { FmsTrainTrack } from "@/components/saas/fms-train-track";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canControlFmsPipeline, canCompleteFmsStep } from "@/lib/fms/access";
import { getFmsInstance, getFmsPipelineCounts } from "@/lib/fms/queries";
import { listFmsAuditForInstance } from "@/lib/fms/audit";
import { listAssignableMembers } from "@/lib/tasks";
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

  const [auditEvents, pipelineCounts] = await Promise.all([
    listFmsAuditForInstance(instanceId, user.organizationId),
    getFmsPipelineCounts(user.organizationId),
  ]);

  const canControl = canControlFmsPipeline(user.role);
  const activeStep = instance.stepStates.find((s) => s.status === "IN_PROGRESS");
  const canComplete =
    Boolean(activeStep) &&
    instance.status === "ACTIVE" &&
    canCompleteFmsStep(user, activeStep ?? { ownerUserId: null });

  const members = canControl
    ? await listAssignableMembers(user.organizationId)
    : [];

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

  const trainStops = instance.stepStates.map((s) => ({
    id: s.id,
    name: s.step.stepName,
    status: s.status,
    plannedAt: s.plannedAt,
    actualAt: s.actualAt,
    delayMinutes: s.delayMinutes,
    ownerName: s.owner?.name ?? s.owner?.email.split("@")[0] ?? null,
  }));

  const attachmentRows = instance.stepStates.flatMap((stepState) =>
    stepState.attachments.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      stepName: stepState.step.stepName,
    })),
  );

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
            <FmsPipelineCountBadges counts={pipelineCounts} />
          </div>
        </header>

        <FmsTrainTrack
          stops={trainStops}
          startLabel="Form submitted"
          endLabel="Complete"
          showOwner
        />

        {activeStep ? (
          <dl className="ws-fms-journey-active-meta">
            <div>
              <dt>Doer</dt>
              <dd>
                {activeStep.owner?.name ??
                  activeStep.owner?.email.split("@")[0] ??
                  "Unassigned"}
              </dd>
            </div>
            <div>
              <dt>Delay status</dt>
              <dd>
                {activeOverdue && activeDelayLabel ? (
                  <span className="ws-fms-train-delay-badge is-late">
                    {activeDelayLabel}
                  </span>
                ) : activeStep.plannedAt ? (
                  <span className="ws-fms-train-delay-badge is-ok">On track</span>
                ) : (
                  <span className="ws-fms-train-delay-badge is-neutral">
                    In progress
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : null}

        {activeStep?.plannedAt ? (
          <p className="ws-fms-journey-due">
            Due at this stop:{" "}
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(activeStep.plannedAt)}
          </p>
        ) : null}

        {canControl ? (
          <FmsInstanceControlPanel
            instanceId={instance.id}
            instanceStatus={instance.status}
            activeStep={activeStep ?? null}
            members={members}
          />
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

        <FmsInstanceAttachments rows={attachmentRows} />

        <FmsInstanceActivity
          auditEvents={auditEvents}
          completePanel={
            activeStep && instance.status === "ACTIVE"
              ? {
                  canComplete,
                  stepState: {
                    id: activeStep.id,
                    status: activeStep.status,
                    ownerUserId: activeStep.ownerUserId,
                    step: {
                      stepName: activeStep.step.stepName,
                      allowMarkDone: activeStep.step.allowMarkDone,
                      allowUpload: activeStep.step.allowUpload,
                      allowNotes: activeStep.step.allowNotes,
                      captureFields: activeStep.step.captureFields,
                    },
                  },
                }
              : null
          }
          steps={instance.stepStates}
        />
      </div>
    </div>
  );
}
