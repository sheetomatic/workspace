import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsMasterTrackerBlock } from "@/components/saas/fms-master-tracker-block";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { getFmsTrackerBlockByTemplate } from "@/lib/fms/queries";
import { isStepOverdue } from "@/lib/fms/step-display";

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function FmsMyStopsTemplatePage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { templateId } = await params;

  const template = await getFmsTrackerBlockByTemplate(
    user.organizationId,
    templateId,
    { assigneeUserId: user.id, instanceStatus: "ACTIVE" },
  );

  if (!template) {
    notFound();
  }

  const mySteps = template.instances.flatMap((instance) =>
    instance.stepStates.filter(
      (state) =>
        state.ownerUserId === user.id && state.status === "IN_PROGRESS",
    ),
  );
  const overdue = mySteps.filter((state) =>
    isStepOverdue(
      state.status,
      state.plannedAt,
      state.actualAt,
      state.delayMinutes,
    ),
  ).length;
  const onTrack = mySteps.length - overdue;

  const block = {
    id: template.id,
    name: template.name,
    form: template.form,
    steps: template.steps.map((step) => ({
      id: step.id,
      stepName: step.stepName,
      roleLabel: step.roleLabel,
      instructions: step.instructions,
      slaType: step.slaType,
      slaConfig: step.slaConfig,
      allowMarkDone: step.allowMarkDone,
      allowUpload: step.allowUpload,
      allowNotes: step.allowNotes,
      captureFields: step.captureFields,
      defaultOwner: step.defaultOwner,
    })),
    instances: template.instances.map((instance) => ({
      id: instance.id,
      referenceLabel: instance.referenceLabel,
      submission: instance.submission,
      stepStates: instance.stepStates.map((state) => ({
        id: state.id,
        stepId: state.stepId,
        status: state.status,
        plannedAt: state.plannedAt,
        actualAt: state.actualAt,
        delayMinutes: state.delayMinutes,
        ownerUserId: state.ownerUserId,
        owner: state.owner,
      })),
    })),
  };

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title={template.name}
        description="Your stops on this workflow. Tap Complete on your active cell to mark done or upload proof."
        actions={
          <Link href="/app/fms/my-stops" className="btn-secondary btn-sm">
            All workflows
          </Link>
        }
      />

      <FmsMasterTrackerBlock
        block={block}
        viewerUserId={user.id}
        showEditLink={false}
        summary={
          <div className="ws-sf-metrics ws-fms-metrics ws-fms-tracker-metrics">
            <div className="ws-sf-metric-tile">
              <span>Your active stops</span>
              <strong>{mySteps.length}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>On track</span>
              <strong>{onTrack}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>Delayed</span>
              <strong>{overdue}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>Assigned leads</span>
              <strong>{template.instances.length}</strong>
            </div>
          </div>
        }
      />

      <p className="ws-fms-muted ws-fms-tracker-footnote">
        Other team members see the same workflow with their own stops highlighted.
        Use the gear on a step header for WHAT, HOW, WHO, WHEN, and TAT.
      </p>
    </div>
  );
}
