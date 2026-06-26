import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsInstanceActivity } from "@/components/saas/fms-instance-activity";
import { FmsInstanceAttachments } from "@/components/saas/fms-instance-attachments";
import { FmsInstanceControlPanel } from "@/components/saas/fms-instance-control-panel";
import { FmsInstanceJourneyRow } from "@/components/saas/fms-instance-journey-row";
import { FmsClaimStepBanner } from "@/components/saas/fms-claim-step-banner";
import { FmsPipelineCountBadges } from "@/components/saas/fms-pipeline-count-badges";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  canControlFmsPipeline,
  canCompleteFmsStep,
  canViewFmsInstance,
  canClaimFmsStep,
} from "@/lib/fms/access";
import { resolveFmsBackLink } from "@/lib/fms/navigation";
import { getFmsInstance, getFmsPipelineCounts } from "@/lib/fms/queries";
import { listFmsAuditForInstance } from "@/lib/fms/audit";
import { listAssignableMembers } from "@/lib/tasks";

type PageProps = {
  params: Promise<{ instanceId: string }>;
  searchParams: Promise<{ from?: string; templateId?: string; action?: string }>;
};

export default async function FmsInstancePage({ params, searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { instanceId } = await params;
  const query = await searchParams;
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const backLink = resolveFmsBackLink({
    from: query.from,
    templateId: query.templateId,
    isManager,
    defaultForManager: "lines",
    defaultForMember: "my-stops",
  });
  const instance = await getFmsInstance(instanceId, user.organizationId);

  if (!instance) {
    notFound();
  }

  const accessContext = {
    submission: instance.submission,
    stepStates: instance.stepStates.map((step) => ({
      ownerUserId: step.ownerUserId,
      completedByUserId: step.completedByUserId,
    })),
  };

  if (!canViewFmsInstance(user, accessContext)) {
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
  const canClaim =
    Boolean(activeStep) &&
    instance.status === "ACTIVE" &&
    canClaimFmsStep(user, activeStep ?? { ownerUserId: null, status: "PENDING" });

  const members = canControl
    ? await listAssignableMembers(user.organizationId)
    : [];

  const submissionValues = instance.submission?.values as
    | Record<string, unknown>
    | undefined;

  const completedCount = instance.stepStates.filter((s) => s.status === "DONE").length;

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
          <Link href={backLink.href} className="btn-secondary btn-sm">
            {backLink.label}
          </Link>
        }
      />

      <section className={`ws-sf-card ws-fms-journey-hero${canComplete ? " is-compact" : ""}`}>
        <header className="ws-fms-journey-header">
          <div>
            <p className="ws-fms-journey-eyebrow">Lead → FMS flow</p>
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

        <FmsInstanceJourneyRow
          leadLabel={instance.referenceLabel ?? "Lead"}
          formName={instance.template.form.name}
          formFields={instance.template.form.fields.map((field) => ({
            id: field.id,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            options: field.options,
          }))}
          submissionValues={submissionValues ?? {}}
          submittedAt={instance.submission?.createdAt ?? null}
          instanceStatus={instance.status}
          steps={instance.stepStates}
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
        />

        {canClaim && activeStep ? (
          <FmsClaimStepBanner instanceId={instance.id} stepStateId={activeStep.id} />
        ) : null}

        {canControl ? (
          <FmsInstanceControlPanel
            instanceId={instance.id}
            instanceStatus={instance.status}
            activeStep={
              activeStep
                ? {
                    id: activeStep.id,
                    status: activeStep.status,
                    ownerUserId: activeStep.ownerUserId,
                    plannedAt: activeStep.plannedAt,
                    step: { stepName: activeStep.step.stepName },
                    owner: activeStep.owner,
                  }
                : null
            }
            members={members}
          />
        ) : null}
      </section>

      <div className="ws-fms-instance-layout">
        <FmsInstanceAttachments
          rows={attachmentRows}
          showUploadHint={
            canComplete &&
            Boolean(activeStep) &&
            activeStep!.step.allowUpload !== false
          }
        />

        <FmsInstanceActivity auditEvents={auditEvents} />
      </div>
    </div>
  );
}
